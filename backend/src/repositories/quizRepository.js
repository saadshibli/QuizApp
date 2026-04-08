/**
 * Quiz Repository
 * Handles all database queries related to quizzes and questions
 */

const { query } = require("../config/database");

class QuizRepository {
  // ==================== QUIZ QUERIES ====================

  /**
   * Create a new quiz
   */
  static async createQuiz(quizData) {
    const { title, description, teacherId, theme = "none", advance_mode = "auto", advance_seconds = 5 } = quizData;

    const result = await query(
      `INSERT INTO quizzes (title, description, teacher_id, theme, advance_mode, advance_seconds, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, title, description, teacher_id, theme, advance_mode, advance_seconds, created_at`,
      [title, description, teacherId, theme, advance_mode, advance_seconds],
    );

    return result.rows[0];
  }

  /**
   * Get quiz by ID with questions and options (optimized with JOINs)
   */
  static async getQuizById(quizId) {
    const quizResult = await query(
      `SELECT id, title, description, teacher_id, theme, advance_mode, advance_seconds, created_at
       FROM quizzes WHERE id = $1`,
      [quizId],
    );

    if (!quizResult.rows[0]) return null;

    // Single query using LEFT JOIN instead of N+1
    const questionsResult = await query(
      `SELECT q.id AS question_id, q.quiz_id, q.question_text, q.time_limit, 
              q.points, q.question_order,
              o.id AS option_id, o.option_text, o.is_correct
       FROM questions q
       LEFT JOIN options o ON o.question_id = q.id
       WHERE q.quiz_id = $1
       ORDER BY q.question_order ASC, o.id ASC`,
      [quizId],
    );

    // Build questions with nested options from flat join results
    const questionsMap = new Map();
    for (const row of questionsResult.rows) {
      if (!questionsMap.has(row.question_id)) {
        questionsMap.set(row.question_id, {
          id: row.question_id,
          quiz_id: row.quiz_id,
          question_text: row.question_text,
          time_limit: row.time_limit,
          points: row.points,
          question_order: row.question_order,
          options: [],
        });
      }
      if (row.option_id) {
        questionsMap.get(row.question_id).options.push({
          id: row.option_id,
          question_id: row.question_id,
          option_text: row.option_text,
          is_correct: row.is_correct,
        });
      }
    }

    return {
      ...quizResult.rows[0],
      questions: Array.from(questionsMap.values()),
    };
  }

  /**
   * Get quizzes by teacher
   */
  static async getQuizzesByTeacher(teacherId) {
    const result = await query(
      `SELECT q.id, q.title, q.description, q.teacher_id, q.theme, q.created_at,
              (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) AS question_count,
              (SELECT COUNT(*) FROM sessions WHERE quiz_id = q.id) AS attempts_count
       FROM quizzes q WHERE q.teacher_id = $1
       ORDER BY q.created_at DESC`,
      [teacherId],
    );

    return result.rows.map((row) => ({
      ...row,
      question_count: parseInt(row.question_count, 10),
      attempts_count: parseInt(row.attempts_count, 10),
    }));
  }

  /**
   * Update quiz
   */
  static async updateQuiz(quizId, updateData) {
    const { title, description, theme, advance_mode, advance_seconds } = updateData;

    const result = await query(
      `UPDATE quizzes
       SET title = COALESCE($2, title),
           description = COALESCE($3, description),
           theme = COALESCE($4, theme),
           advance_mode = COALESCE($5, advance_mode),
           advance_seconds = COALESCE($6, advance_seconds)
       WHERE id = $1
       RETURNING id, title, description, teacher_id, theme, advance_mode, advance_seconds, created_at`,
      [quizId, title, description, theme, advance_mode, advance_seconds],
    );

    return result.rows[0] || null;
  }

  /**
   * Delete quiz (soft delete approach - optional)
   */
  static async deleteQuiz(quizId) {
    const result = await query(
      `DELETE FROM quizzes WHERE id = $1
       RETURNING id`,
      [quizId],
    );

    return result.rows[0] || null;
  }

  // ==================== QUESTION QUERIES ====================

  /**
   * Create a question
   */
  static async createQuestion(questionData) {
    const {
      quizId,
      questionText,
      timeLimit = 30,
      points = 100,
      questionOrder = 1,
    } = questionData;

    const result = await query(
      `INSERT INTO questions (quiz_id, question_text, time_limit, points, question_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, quiz_id, question_text, time_limit, points, question_order`,
      [quizId, questionText, timeLimit, points, questionOrder],
    );

    return result.rows[0];
  }

  /**
   * Get question with options
   */
  static async getQuestionWithOptions(questionId) {
    const question = await query(
      `SELECT id, quiz_id, question_text, time_limit, points, question_order
       FROM questions WHERE id = $1`,
      [questionId],
    );

    if (!question.rows[0]) return null;

    const options = await query(
      `SELECT id, question_id, option_text, is_correct
       FROM options WHERE question_id = $1`,
      [questionId],
    );

    return {
      ...question.rows[0],
      options: options.rows,
    };
  }

  /**
   * Get questions by quiz ID
   */
  static async getQuestionsByQuiz(quizId) {
    const result = await query(
      `SELECT id, quiz_id, question_text, time_limit, points, question_order
       FROM questions WHERE quiz_id = $1
       ORDER BY question_order ASC`,
      [quizId],
    );

    return result.rows;
  }

  /**
   * Update question
   */
  static async updateQuestion(questionId, updateData) {
    const { questionText, timeLimit, points } = updateData;

    const result = await query(
      `UPDATE questions
       SET question_text = COALESCE($2, question_text),
           time_limit = COALESCE($3, time_limit),
           points = COALESCE($4, points)
       WHERE id = $1
       RETURNING id, quiz_id, question_text, time_limit, points, question_order`,
      [questionId, questionText, timeLimit, points],
    );

    return result.rows[0] || null;
  }

  /**
   * Delete question (clears FK references first)
   */
  static async deleteQuestion(questionId) {
    // Clear any session references (current_question FK)
    await query(
      `UPDATE sessions SET current_question = NULL WHERE current_question = $1`,
      [questionId],
    );

    // Delete answers referencing options of this question
    await query(`DELETE FROM answers WHERE question_id = $1`, [questionId]);

    // Delete options belonging to this question
    await query(`DELETE FROM options WHERE question_id = $1`, [questionId]);

    // Now delete the question itself
    const result = await query(
      `DELETE FROM questions WHERE id = $1
       RETURNING id`,
      [questionId],
    );

    return result.rows[0] || null;
  }

  // ==================== OPTIONS QUERIES ====================

  /**
   * Create option
   */
  static async createOption(optionData) {
    const { questionId, optionText, isCorrect = false } = optionData;

    const result = await query(
      `INSERT INTO options (question_id, option_text, is_correct)
       VALUES ($1, $2, $3)
       RETURNING id, question_id, option_text, is_correct`,
      [questionId, optionText, isCorrect],
    );

    return result.rows[0];
  }

  /**
   * Update option
   */
  static async updateOption(optionId, updateData) {
    const { optionText, isCorrect } = updateData;

    const result = await query(
      `UPDATE options
       SET option_text = COALESCE($2, option_text),
           is_correct = COALESCE($3, is_correct)
       WHERE id = $1
       RETURNING id, question_id, option_text, is_correct`,
      [optionId, optionText, isCorrect],
    );

    return result.rows[0] || null;
  }

  /**
   * Delete option
   */
  static async deleteOption(optionId) {
    const result = await query(
      `DELETE FROM options WHERE id = $1
       RETURNING id`,
      [optionId],
    );

    return result.rows[0] || null;
  }

  /**
   * Get options by question
   */
  static async getOptionsByQuestion(questionId) {
    const result = await query(
      `SELECT id, question_id, option_text, is_correct
       FROM options WHERE question_id = $1`,
      [questionId],
    );

    return result.rows;
  }
}

module.exports = QuizRepository;
