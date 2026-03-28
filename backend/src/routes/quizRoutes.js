/**
 * Quiz Routes
 * CRUD operations for quizzes and questions
 */

const express = require("express");
const QuizController = require("../controllers/quizController");
const { authenticate, authorize } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");

const router = express.Router();

// All quiz routes require authentication and teacher role
router.use(authenticate, authorize("teacher"));

/**
 * POST /api/quizzes
 * Create a new quiz
 * Body: { title, description, theme }
 */
router.post(
  "/",
  validate(schemas.createQuiz, "body"),
  QuizController.createQuiz,
);

/**
 * GET /api/quizzes
 * Get all quizzes for the teacher
 */
router.get("/", QuizController.getTeacherQuizzes);

/**
 * GET /api/quizzes/:quizId
 * Get quiz details with questions and options
 */
router.get("/:quizId", QuizController.getQuiz);

/**
 * PUT /api/quizzes/:quizId
 * Update quiz
 */
router.put("/:quizId", QuizController.updateQuiz);

/**
 * DELETE /api/quizzes/:quizId
 * Delete quiz
 */
router.delete("/:quizId", QuizController.deleteQuiz);

/**
 * POST /api/quizzes/:quizId/questions
 * Add question to quiz
 * Body: { question_text, time_limit, points }
 */
router.post(
  "/:quizId/questions",
  validate(schemas.addQuestion, "body"),
  QuizController.addQuestion,
);

module.exports = router;
