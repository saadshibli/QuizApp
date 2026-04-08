/**
 * Session Controller
 * Handles session-related HTTP requests
 */

const SessionService = require("../services/sessionService");
const SessionRepository = require("../repositories/sessionRepository");
const QuizRepository = require("../repositories/quizRepository");

/**
 * Sanitize user input by stripping all HTML/script content
 */
function sanitizeString(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

class SessionController {
  /**
   * POST /api/sessions/start
   * Start a new quiz session
   */
  static async startSession(req, res, next) {
    try {
      const { quiz_id } = req.body;
      const session = await SessionService.startSession(quiz_id, req.user.id);
      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/sessions/join
   * Join a session as a participant
   */
  static async joinSession(req, res, next) {
    try {
      const { session_code } = req.body;
      // Sanitize nickname: trim whitespace and HTML-encode special chars
      const nickname = sanitizeString((req.body.nickname || "").trim()).slice(
        0,
        50,
      );
      if (!nickname) {
        return res
          .status(400)
          .json({ success: false, error: "Nickname is required" });
      }
      const userId = req.user.id;

      const participant = await SessionService.joinSession(
        session_code,
        userId,
        nickname,
      );

      res.status(201).json({ ...participant, session_code });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/sessions/:sessionId
   * Get session details (only for session owner or participant)
   */
  static async getSession(req, res, next) {
    try {
      const sessionId = req.params.sessionId;

      // Authorization: verify user is owner or participant
      const session = await SessionRepository.getSessionById(sessionId);
      if (session) {
        const quiz = await QuizRepository.getQuizById(session.quiz_id);
        const isOwner = quiz && quiz.teacher_id === req.user.id;
        const participant = await SessionRepository.getParticipant(
          sessionId,
          req.user.id,
        );
        if (!isOwner && !participant) {
          return res
            .status(403)
            .json({ error: "You are not authorized to view this session" });
        }
      }

      const sessionData = await SessionService.getSession(sessionId);
      res.json(sessionData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/sessions/by-code/:code
   * Get session details by session code
   */
  static async getSessionByCode(req, res, next) {
    try {
      const sessionData = await SessionService.getSessionByCode(
        req.params.code,
      );

      // Authorization: user must be quiz owner or session participant
      const session = sessionData.session;
      const quiz = await QuizRepository.getQuizById(session.quiz_id);
      const isOwner = quiz && quiz.teacher_id === req.user.id;
      if (!isOwner) {
        const participant = await SessionRepository.getParticipant(
          session.id,
          req.user.id,
        );
        if (!participant) {
          return res
            .status(403)
            .json({ error: "Not authorized to view this session" });
        }
      }

      res.json(sessionData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/sessions/:sessionId/start
   * Start quiz (move from Lobby to Active)
   */
  static async startQuiz(req, res, next) {
    try {
      const session = await SessionService.startQuiz(
        req.params.sessionId,
        req.user.id,
      );
      res.json(session);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/sessions/:sessionId/next-question
   * Move to next question
   */
  static async nextQuestion(req, res, next) {
    try {
      const session = await SessionService.nextQuestion(
        req.params.sessionId,
        req.user.id,
      );
      res.json(session);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/sessions/:sessionId/answer
   * Submit answer
   */
  static async submitAnswer(req, res, next) {
    try {
      const { question_id, option_id, response_time } = req.body;
      const result = await SessionService.submitAnswer(
        req.params.sessionId,
        req.user.id,
        question_id,
        option_id,
        response_time,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/sessions/:sessionId/leaderboard
   * Get session leaderboard
   */
  static async getLeaderboard(req, res, next) {
    try {
      const leaderboard = await SessionService.getLeaderboard(
        req.params.sessionId,
      );
      res.json(leaderboard);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/sessions/history
   * Get quiz history for the logged-in student
   */
  static async getQuizHistory(req, res, next) {
    try {
      const history = await SessionService.getQuizHistory(req.user.id);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SessionController;
