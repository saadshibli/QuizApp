/**
 * User Repository
 * Handles all database queries related to users
 */

const { query } = require("../config/database");

class UserRepository {
  /**
   * Create a new user
   * @param {object} userData - User data object
   */
  static async createUser(userData) {
    const { name, email, passwordHash, role, avatar = null } = userData;

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, avatar, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, name, email, role, avatar, created_at`,
      [name, email, passwordHash, role, avatar],
    );

    return result.rows[0];
  }

  /**
   * Find user by email
   * @param {string} email - User email
   */
  static async findByEmail(email) {
    const result = await query(
      `SELECT id, name, email, password_hash, role, avatar, created_at
       FROM users WHERE email = $1`,
      [email],
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   * @param {number} userId - User ID
   */
  static async findById(userId) {
    const result = await query(
      `SELECT id, name, email, role, avatar, created_at
       FROM users WHERE id = $1`,
      [userId],
    );

    return result.rows[0] || null;
  }

  /**
   * Update user profile
   * @param {number} userId - User ID
   * @param {object} updateData - Data to update
   */
  static async updateUser(userId, updateData) {
    const { name, avatar } = updateData;

    const result = await query(
      `UPDATE users
       SET name = COALESCE($2, name),
           avatar = COALESCE($3, avatar)
       WHERE id = $1
       RETURNING id, name, email, role, avatar, created_at`,
      [userId, name, avatar],
    );

    return result.rows[0] || null;
  }

  /**
   * Get all teachers
   */
  static async getAllTeachers() {
    const result = await query(
      `SELECT id, name, email, avatar, created_at
       FROM users WHERE role = 'teacher'
       ORDER BY created_at DESC`,
    );

    return result.rows;
  }
}

module.exports = UserRepository;
