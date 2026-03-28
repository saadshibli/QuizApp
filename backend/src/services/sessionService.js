/**
 * Session Service
 * Handles session creation, management, and scoring logic
 */

const SessionRepository = require("../repositories/sessionRepository");
const QuizRepository = require("../repositories/quizRepository");
const ApiError = require("../utils/ApiError");

const MAX_SESSION_CODE_RETRIES = 5;

class SessionService {
  /**
   * Generate a unique 6-digit session code with retry logic
   */
  static async generateUniqueSessionCode() {
    for (let i = 0; i < MAX_SESSION_CODE_RETRIES; i++) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = await SessionRepository.getSessionByCode(code);
      if (!existing) return code;
    }
    throw ApiError.conflict(
      "Unable to generate unique session code. Please try again.",
    );
  }

  /**
   * Start a new session
   */
  static async startSession(quizId, teacherId) {
    const quiz = await QuizRepository.getQuizById(quizId);

    if (!quiz) {
      throw ApiError.notFound("Quiz not found");
    }

    if (quiz.teacher_id !== teacherId) {
      throw ApiError.forbidden("You can only start your own quizzes");
    }

    if (quiz.questions.length === 0) {
      throw ApiError.badRequest("Quiz must have at least one question");
    }

    const sessionCode = await this.generateUniqueSessionCode();

    const session = await SessionRepository.createSession({
      quizId,
      sessionCode,
      status: "Lobby",
    });

    return {
      ...session,
      code: sessionCode,
    };
  }

  /**
   * Join session as participant
   */
  static async joinSession(sessionCode, userId, nickname) {
    const session = await SessionRepository.getSessionByCode(sessionCode);

    if (!session) {
      throw ApiError.notFound("Session not found");
    }

    if (session.status === "Completed") {
      throw ApiError.badRequest("This session has already ended");
    }

    // Check if user is already in session
    const existingParticipant = await SessionRepository.getParticipant(
      session.id,
      userId,
    );

    if (existingParticipant) {
      return existingParticipant;
    }

    // Add participant
    const participant = await SessionRepository.addParticipant({
      sessionId: session.id,
      userId,
      nickname,
    });

    return participant;
  }

  /**
   * Start quiz (move from Lobby to Active)
   */
  static async startQuiz(sessionId, teacherId) {
    const session = await SessionRepository.getSessionById(sessionId);

    if (!session) {
      throw ApiError.notFound("Session not found");
    }

    const quiz = await QuizRepository.getQuizById(session.quiz_id);

    if (quiz.teacher_id !== teacherId) {
      throw ApiError.forbidden("You can only start your own sessions");
    }

    const updatedSession = await SessionRepository.updateSessionStatus(
      sessionId,
      "Active",
    );

    // Set first question
    if (quiz.questions.length > 0) {
      await SessionRepository.updateCurrentQuestion(
        sessionId,
        quiz.questions[0].id,
      );
    }

    return updatedSession;
  }

  /**
   * Move to next question
   */
  static async nextQuestion(sessionId, teacherId) {
    const session = await SessionRepository.getSessionById(sessionId);

    if (!session) {
      throw ApiError.notFound("Session not found");
    }

    const quiz = await QuizRepository.getQuizById(session.quiz_id);

    if (quiz.teacher_id !== teacherId) {
      throw ApiError.forbidden("You can only control your own sessions");
    }

    // Find current question index
    const currentIndex = quiz.questions.findIndex(
      (q) => q.id === session.current_question,
    );

    if (currentIndex === -1) {
      throw ApiError.badRequest("No current question found");
    }

    // Check if there's a next question
    if (currentIndex + 1 >= quiz.questions.length) {
      // End quiz
      return await SessionRepository.updateSessionStatus(
        sessionId,
        "Completed",
      );
    }

    // Set next question
    const nextQuestionId = quiz.questions[currentIndex + 1].id;
    return await SessionRepository.updateCurrentQuestion(
      sessionId,
      nextQuestionId,
    );
  }

  /**
   * Submit answer and calculate score
   */
  static async submitAnswer(
    sessionId,
    userId,
    questionId,
    optionId,
    responseTime,
  ) {
    const session = await SessionRepository.getSessionById(sessionId);

    if (!session) {
      throw ApiError.notFound("Session not found");
    }

    if (session.status !== "Active") {
      throw ApiError.badRequest("Session is not active");
    }

    const participant = await SessionRepository.getParticipant(
      sessionId,
      userId,
    );
    const question = await QuizRepository.getQuestionWithOptions(questionId);

    if (!participant || !question) {
      throw ApiError.notFound("Invalid participant or question");
    }

    // Verify the submitted option belongs to this question
    const validOption = question.options.find((o) => o.id === optionId);
    if (!validOption) {
      throw ApiError.badRequest("Option does not belong to this question");
    }

    // Prevent duplicate answers
    const existingAnswer = await SessionRepository.getAnswer(
      participant.id,
      questionId,
    );
    if (existingAnswer) {
      return {
        answer: existingAnswer,
        isCorrect: existingAnswer.points_awarded > 0,
        pointsAwarded: 0,
        duplicate: true,
      };
    }

    // Validate responseTime
    const clampedResponseTime = Math.max(
      0,
      Math.min(responseTime, question.time_limit * 1000),
    );

    // Check if option is correct
    const selectedOption = question.options.find((o) => o.id === optionId);
    const isCorrect = selectedOption?.is_correct || false;

    // Calculate score based on speed
    let pointsAwarded = 0;
    if (isCorrect) {
      const timeRatio = clampedResponseTime / (question.time_limit * 1000);
      const scorePercent = Math.min(1.0, Math.max(0.5, 1 - timeRatio));
      pointsAwarded = Math.round(question.points * scorePercent);
    }

    // Record answer
    const answer = await SessionRepository.recordAnswer({
      participantId: participant.id,
      questionId,
      optionId,
      responseTime,
      pointsAwarded,
    });

    // Update participant score
    await SessionRepository.updateParticipantScore(
      participant.id,
      pointsAwarded,
    );

    // Update leaderboard
    await SessionRepository.updateLeaderboard(sessionId);

    return {
      answer,
      isCorrect,
      pointsAwarded,
    };
  }

  /**
   * Get session details (includes quiz theme for display)
   */
  static async getSession(sessionId) {
    const session = await SessionRepository.getSessionById(sessionId);

    if (!session) {
      throw ApiError.notFound("Session not found");
    }

    const participants =
      await SessionRepository.getSessionParticipants(sessionId);
    const leaderboard = await SessionRepository.getLeaderboard(sessionId);

    // Attach quiz info (theme, title) so student pages can display it
    let quizTheme = "none";
    let quizTitle = "";
    try {
      const quiz = await QuizRepository.getQuizById(session.quiz_id);
      if (quiz) {
        quizTheme = quiz.theme || "none";
        quizTitle = quiz.title || "";
      }
    } catch (e) {
      // non-critical, just use defaults
    }

    return {
      session: { ...session, quiz_theme: quizTheme, quiz_title: quizTitle },
      participants,
      leaderboard,
    };
  }

  /**
   * Get session details by code
   */
  static async getSessionByCode(sessionCode) {
    const session = await SessionRepository.getSessionByCode(sessionCode);

    if (!session) {
      throw ApiError.notFound("Session not found");
    }

    const participants = await SessionRepository.getSessionParticipants(
      session.id,
    );
    const leaderboard = await SessionRepository.getLeaderboard(session.id);

    let quizTheme = "none";
    let quizTitle = "";
    try {
      const quiz = await QuizRepository.getQuizById(session.quiz_id);
      if (quiz) {
        quizTheme = quiz.theme || "none";
        quizTitle = quiz.title || "";
      }
    } catch (e) {
      // non-critical
    }

    return {
      session: { ...session, quiz_theme: quizTheme, quiz_title: quizTitle },
      participants,
      leaderboard,
    };
  }

  /**
   * Get leaderboard for session
   */
  static async getLeaderboard(sessionId) {
    const session = await SessionRepository.getSessionById(sessionId);

    if (!session) {
      throw ApiError.notFound("Session not found");
    }

    const leaderboard = await SessionRepository.getLeaderboard(sessionId);
    return leaderboard;
  }

  /**
   * Get quiz history for a logged-in student
   */
  static async getQuizHistory(userId) {
    return await SessionRepository.getQuizHistory(userId);
  }
}

module.exports = SessionService;
