/**
 * Quiz Controller
 * Handles quiz-related HTTP requests
 */

const QuizService = require("../services/quizService");

class QuizController {
  /**
   * POST /api/quizzes
   * Create a new quiz
   */
  static async createQuiz(req, res, next) {
    try {
      const quiz = await QuizService.createQuiz(req.body, req.user.id);
      res.status(201).json(quiz);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/quizzes/:quizId
   * Get quiz details
   */
  static async getQuiz(req, res, next) {
    try {
      const quiz = await QuizService.getQuiz(req.params.quizId);
      res.json(quiz);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/quizzes
   * Get all quizzes for teacher
   */
  static async getTeacherQuizzes(req, res, next) {
    try {
      const quizzes = await QuizService.getTeacherQuizzes(req.user.id);
      res.json(quizzes);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/quizzes/:quizId
   * Update quiz
   */
  static async updateQuiz(req, res, next) {
    try {
      const quiz = await QuizService.updateQuiz(
        req.params.quizId,
        req.body,
        req.user.id,
      );
      res.json(quiz);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/quizzes/:quizId
   * Delete quiz
   */
  static async deleteQuiz(req, res, next) {
    try {
      await QuizService.deleteQuiz(req.params.quizId, req.user.id);
      res.json({ message: "Quiz deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/quizzes/:quizId/questions
   * Add question to quiz
   */
  static async addQuestion(req, res, next) {
    try {
      const question = await QuizService.addQuestion(
        req.params.quizId,
        req.body,
        req.user.id,
      );
      res.status(201).json(question);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/questions/:questionId/options
   * Add option to question
   */
  static async addOption(req, res, next) {
    try {
      const option = await QuizService.addOption(
        req.params.questionId,
        req.body,
        req.user.id,
      );
      res.status(201).json(option);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/questions/:questionId
   * Update question
   */
  static async updateQuestion(req, res, next) {
    try {
      const question = await QuizService.updateQuestion(
        req.params.questionId,
        req.body,
        req.user.id,
      );
      res.json(question);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/questions/:questionId
   * Delete question
   */
  static async deleteQuestion(req, res, next) {
    try {
      await QuizService.deleteQuestion(req.params.questionId, req.user.id);
      res.json({ message: "Question deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = QuizController;
