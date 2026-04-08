const express = require("express");
const SessionController = require("../controllers/sessionController");
const {
  authenticate,
  authorize,
} = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");
const { answerLimiter, joinLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post(
  "/start",
  authenticate,
  authorize("teacher"),
  validate(schemas.startSession, "body"),
  SessionController.startSession,
);

router.post(
  "/join",
  joinLimiter,
  authenticate,
  validate(schemas.joinSession, "body"),
  SessionController.joinSession,
);

router.get("/history", authenticate, SessionController.getQuizHistory);

router.get("/by-code/:code", authenticate, SessionController.getSessionByCode);

router.get(
  "/:sessionId",
  authenticate,
  validate(schemas.sessionIdParam, "params"),
  SessionController.getSession,
);

router.post(
  "/:sessionId/start",
  authenticate,
  authorize("teacher"),
  validate(schemas.sessionIdParam, "params"),
  SessionController.startQuiz,
);

router.post(
  "/:sessionId/next-question",
  authenticate,
  authorize("teacher"),
  validate(schemas.sessionIdParam, "params"),
  SessionController.nextQuestion,
);

router.post(
  "/:sessionId/answer",
  answerLimiter,
  authenticate,
  validate(schemas.sessionIdParam, "params"),
  validate(schemas.submitAnswer, "body"),
  SessionController.submitAnswer,
);

router.get(
  "/:sessionId/leaderboard",
  authenticate,
  validate(schemas.sessionIdParam, "params"),
  SessionController.getLeaderboard,
);

module.exports = router;
