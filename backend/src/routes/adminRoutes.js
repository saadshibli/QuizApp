/**
 * Admin Routes
 * GET /stats, /users, /quizzes, /sessions
 */

const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const db = require("../config/database");

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, authorize("admin"));

/**
 * GET /api/admin/stats
 * Returns system-wide statistics
 */
router.get("/stats", async (req, res, next) => {
  try {
    const [users, quizzes, sessions, activeSessionsResult] = await Promise.all([
      db.query("SELECT COUNT(*) as count FROM users"),
      db.query("SELECT COUNT(*) as count FROM quizzes"),
      db.query("SELECT COUNT(*) as count FROM sessions"),
      db.query(
        "SELECT COUNT(*) as count FROM sessions WHERE status = 'Active'",
      ),
    ]);

    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalQuizzes: parseInt(quizzes.rows[0].count),
      totalSessions: parseInt(sessions.rows[0].count),
      activeSessions: parseInt(activeSessionsResult.rows[0].count),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/users
 * Returns all users (without password hashes)
 */
router.get("/users", async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 100",
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/quizzes
 * Returns all quizzes with teacher info
 */
router.get("/quizzes", async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT q.id, q.title, q.description, q.theme, q.created_at,
              u.name as teacher_name, u.email as teacher_email,
              (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as question_count
       FROM quizzes q
       JOIN users u ON q.teacher_id = u.id
       ORDER BY q.created_at DESC
       LIMIT 100`,
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/sessions
 * Returns recent sessions with details
 */
router.get("/sessions", async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT s.id, s.session_code, s.status, s.started_at,
              q.title as quiz_title,
              u.name as teacher_name,
              (SELECT COUNT(*) FROM participants WHERE session_id = s.id) as participant_count
       FROM sessions s
       JOIN quizzes q ON s.quiz_id = q.id
       JOIN users u ON q.teacher_id = u.id
       ORDER BY s.started_at DESC
       LIMIT 50`,
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
