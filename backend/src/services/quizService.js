/**
 * Quiz Service
 * Handles quiz creation, management, and retrieval business logic
 */

const QuizRepository = require("../repositories/quizRepository");
const ApiError = require("../utils/ApiError");

class QuizService {
  /**
   * Create a new quiz
   */
  static async createQuiz(quizData, teacherId) {
    return QuizRepository.createQuiz({ ...quizData, teacherId });
  }

  /**
   * Get quiz details
   */
  static async getQuiz(quizId) {
    const quiz = await QuizRepository.getQuizById(quizId);
    if (!quiz) throw ApiError.notFound("Quiz not found");
    return quiz;
  }

  /**
   * Get all quizzes for a teacher
   */
  static async getTeacherQuizzes(teacherId) {
    return QuizRepository.getQuizzesByTeacher(teacherId);
  }

  /**
   * Update quiz
   */
  static async updateQuiz(quizId, updateData, teacherId) {
    const quiz = await QuizRepository.getQuizById(quizId);
    if (!quiz) throw ApiError.notFound("Quiz not found");
    if (quiz.teacher_id !== teacherId)
      throw ApiError.forbidden("You can only update your own quizzes");
    return QuizRepository.updateQuiz(quizId, updateData);
  }

  /**
   * Delete quiz
   */
  static async deleteQuiz(quizId, teacherId) {
    const quiz = await QuizRepository.getQuizById(quizId);
    if (!quiz) throw ApiError.notFound("Quiz not found");
    if (quiz.teacher_id !== teacherId)
      throw ApiError.forbidden("You can only delete your own quizzes");
    await QuizRepository.deleteQuiz(quizId);
  }

  /**
   * Add question to quiz
   */
  static async addQuestion(quizId, questionData, teacherId) {
    const quiz = await QuizRepository.getQuizById(quizId);
    if (!quiz) throw ApiError.notFound("Quiz not found");
    if (quiz.teacher_id !== teacherId)
      throw ApiError.forbidden(
        "You can only add questions to your own quizzes",
      );

    const questionOrder = quiz.questions.length + 1;
    return QuizRepository.createQuestion({
      quizId,
      questionText: questionData.question_text,
      timeLimit: questionData.time_limit,
      points: questionData.points,
      questionOrder,
    });
  }

  /**
   * Add option to question
   */
  static async addOption(questionId, optionData, teacherId) {
    const question = await QuizRepository.getQuestionWithOptions(questionId);
    if (!question) throw ApiError.notFound("Question not found");

    const quiz = await QuizRepository.getQuizById(question.quiz_id);
    if (quiz.teacher_id !== teacherId)
      throw ApiError.forbidden(
        "You can only add options to your own questions",
      );

    return QuizRepository.createOption({
      questionId,
      optionText: optionData.option_text,
      isCorrect: optionData.is_correct,
    });
  }

  /**
   * Update question
   */
  static async updateQuestion(questionId, updateData, teacherId) {
    const question = await QuizRepository.getQuestionWithOptions(questionId);
    if (!question) throw ApiError.notFound("Question not found");

    const quiz = await QuizRepository.getQuizById(question.quiz_id);
    if (quiz.teacher_id !== teacherId)
      throw ApiError.forbidden("You can only update your own questions");

    return QuizRepository.updateQuestion(questionId, updateData);
  }

  /**
   * Delete question
   */
  static async deleteQuestion(questionId, teacherId) {
    const question = await QuizRepository.getQuestionWithOptions(questionId);
    if (!question) throw ApiError.notFound("Question not found");

    const quiz = await QuizRepository.getQuizById(question.quiz_id);
    if (quiz.teacher_id !== teacherId)
      throw ApiError.forbidden("You can only delete your own questions");

    await QuizRepository.deleteQuestion(questionId);
  }
}

module.exports = QuizService;
