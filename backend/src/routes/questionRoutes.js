/**
 * Question Routes
 */

const express = require("express");
const QuizController = require("../controllers/quizController");
const { authenticate, authorize } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");

const router = express.Router();

router.use(authenticate, authorize("teacher"));

router.post(
  "/:questionId/options",
  validate(schemas.addOption, "body"),
  QuizController.addOption,
);

router.put("/:questionId", QuizController.updateQuestion);
router.delete("/:questionId", QuizController.deleteQuestion);

module.exports = router;
