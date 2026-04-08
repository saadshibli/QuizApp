/**
 * Session Repository
 * Handles all database queries related to sessions and participants
 */

const { query } = require("../config/database");

class SessionRepository {
  // ==================== SESSION QUERIES ====================

  /**
   * Create a new session
   */
  static async createSession(sessionData) {
    const { quizId, sessionCode, status = "Lobby" } = sessionData;

    const result = await query(
      `INSERT INTO sessions (quiz_id, session_code, status, started_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, quiz_id, session_code, status, current_question, started_at`,
      [quizId, sessionCode, status],
    );

    return result.rows[0];
  }

  /**
   * Get session by code
   */
  static async getSessionByCode(sessionCode) {
    const result = await query(
      `SELECT id, quiz_id, session_code, status, current_question, started_at
       FROM sessions WHERE session_code = $1`,
      [sessionCode],
    );

    return result.rows[0] || null;
  }

  /**
   * Get session by ID
   */
  static async getSessionById(sessionId) {
    const result = await query(
      `SELECT id, quiz_id, session_code, status, current_question, started_at
       FROM sessions WHERE id = $1`,
      [sessionId],
    );

    return result.rows[0] || null;
  }

  /**
   * Get sessions by quiz ID
   */
  static async getSessionsByQuiz(quizId) {
    const result = await query(
      `SELECT id, quiz_id, session_code, status, current_question, started_at
       FROM sessions WHERE quiz_id = $1
       ORDER BY started_at DESC`,
      [quizId],
    );

    return result.rows;
  }

  /**
   * Update session status
   */
  static async updateSessionStatus(sessionId, status) {
    const result = await query(
      `UPDATE sessions
       SET status = $2
       WHERE id = $1
       RETURNING id, quiz_id, session_code, status, current_question, started_at`,
      [sessionId, status],
    );

    return result.rows[0] || null;
  }

  /**
   * Update current question
   */
  static async updateCurrentQuestion(sessionId, questionId) {
    const result = await query(
      `UPDATE sessions
       SET current_question = $2
       WHERE id = $1
       RETURNING id, quiz_id, session_code, status, current_question, started_at`,
      [sessionId, questionId],
    );

    return result.rows[0] || null;
  }

  // ==================== PARTICIPANT QUERIES ====================

  /**
   * Add participant to session
   */
  static async addParticipant(participantData) {
    const { sessionId, userId, nickname } = participantData;

    const result = await query(
      `INSERT INTO participants (session_id, user_id, nickname, score)
       VALUES ($1, $2, $3, 0)
       RETURNING id, session_id, user_id, nickname, score`,
      [sessionId, userId, nickname],
    );

    return result.rows[0];
  }

  /**
   * Get participant by session and user
   */
  static async getParticipant(sessionId, userId) {
    const result = await query(
      `SELECT id, session_id, user_id, nickname, score
       FROM participants WHERE session_id = $1 AND user_id = $2`,
      [sessionId, userId],
    );

    return result.rows[0] || null;
  }

  /**
   * Get all participants in session
   */
  static async getSessionParticipants(sessionId) {
    const result = await query(
      `SELECT id, session_id, user_id, nickname, score
       FROM participants WHERE session_id = $1
       ORDER BY score DESC`,
      [sessionId],
    );

    return result.rows;
  }

  /**
   * Update participant score
   */
  static async updateParticipantScore(participantId, newScore) {
    const result = await query(
      `UPDATE participants
       SET score = score + $2
       WHERE id = $1
       RETURNING id, session_id, user_id, nickname, score`,
      [participantId, newScore],
    );

    return result.rows[0] || null;
  }

  // ==================== ANSWER QUERIES ====================

  /**
   * Record an answer
   */
  static async recordAnswer(answerData) {
    const { participantId, questionId, optionId, responseTime, pointsAwarded } =
      answerData;

    const result = await query(
      `INSERT INTO answers (participant_id, question_id, option_id, response_time, points_awarded)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, participant_id, question_id, option_id, response_time, points_awarded`,
      [participantId, questionId, optionId, responseTime, pointsAwarded],
    );

    return result.rows[0];
  }

  /**
   * Get answer by participant and question
   */
  static async getAnswer(participantId, questionId) {
    const result = await query(
      `SELECT id, participant_id, question_id, option_id, response_time, points_awarded
       FROM answers WHERE participant_id = $1 AND question_id = $2`,
      [participantId, questionId],
    );

    return result.rows[0] || null;
  }

  /**
   * Get all answers for a session
   */
  static async getSessionAnswers(sessionId) {
    const result = await query(
      `SELECT a.id, a.participant_id, a.question_id, a.option_id, a.response_time, a.points_awarded
       FROM answers a
       JOIN participants p ON a.participant_id = p.id
       WHERE p.session_id = $1
       ORDER BY a.question_id, a.participant_id`,
      [sessionId],
    );

    return result.rows;
  }

  // ==================== LEADERBOARD QUERIES ====================

  /**
   * Update leaderboard using UPSERT to avoid race conditions
   */
  static async updateLeaderboard(sessionId) {
    // Use a single query with ON CONFLICT to atomically upsert rankings
    // Rank by highest score first, then lowest total response time (faster = better)
    const result = await query(
      `INSERT INTO leaderboard (session_id, participant_id, rank, total_score)
       SELECT $1, p.id,
              ROW_NUMBER() OVER (
                ORDER BY p.score DESC,
                COALESCE((SELECT SUM(a.response_time) FROM answers a WHERE a.participant_id = p.id), 0) ASC,
                p.id ASC
              ),
              p.score
       FROM participants p WHERE p.session_id = $1
       ON CONFLICT (session_id, participant_id)
       DO UPDATE SET rank = EXCLUDED.rank, total_score = EXCLUDED.total_score, updated_at = NOW()
       RETURNING id, session_id, participant_id, rank, total_score`,
      [sessionId],
    );

    return result.rows;
  }

  /**
   * Get leaderboard for session
   */
  static async getLeaderboard(sessionId) {
    const result = await query(
      `SELECT l.id, l.session_id, l.participant_id, l.rank, l.total_score,
              p.nickname, p.user_id,
              COALESCE(SUM(a.response_time), 0) AS total_response_time,
              COUNT(a.id) AS answers_count
       FROM leaderboard l
       JOIN participants p ON l.participant_id = p.id
       LEFT JOIN answers a ON a.participant_id = p.id
       WHERE l.session_id = $1
       GROUP BY l.id, l.session_id, l.participant_id, l.rank, l.total_score, p.nickname, p.user_id
       ORDER BY l.rank ASC`,
      [sessionId],
    );

    return result.rows;
  }

  /**
   * Get quiz history for a user (non-guest sessions)
   */
  static async getQuizHistory(userId) {
    const result = await query(
      `SELECT
         s.id AS session_id,
         s.session_code,
         s.status,
         s.started_at,
         q.title AS quiz_title,
         q.theme AS quiz_theme,
         p.score,
         p.nickname,
         l.rank,
         l.total_score,
         (SELECT COUNT(*) FROM participants p2 WHERE p2.session_id = s.id) AS total_players,
         (SELECT COUNT(*) FROM answers a WHERE a.participant_id = p.id) AS questions_answered,
         (SELECT COUNT(*) FROM answers a WHERE a.participant_id = p.id AND a.points_awarded > 0) AS correct_answers
       FROM participants p
       JOIN sessions s ON p.session_id = s.id
       JOIN quizzes q ON s.quiz_id = q.id
       LEFT JOIN leaderboard l ON l.participant_id = p.id AND l.session_id = s.id
       WHERE p.user_id = $1
       ORDER BY s.started_at DESC
       LIMIT 50`,
      [userId],
    );

    return result.rows;
  }
}

module.exports = SessionRepository;
