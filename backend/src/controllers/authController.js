/**
 * Authentication Controller
 * Handles authentication-related HTTP requests
 */

const AuthService = require("../services/authService");

class AuthController {
  /**
   * POST /api/auth/register
   * Register a new user
   */
  static async register(req, res, next) {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   * Login user
   */
  static async login(req, res, next) {
    try {
      const result = await AuthService.login(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/profile
   * Get current user profile
   */
  static async getProfile(req, res, next) {
    try {
      const user = await AuthService.getUserProfile(req.user.id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
