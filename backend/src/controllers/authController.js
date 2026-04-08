/**
 * Authentication Controller
 * Handles authentication-related HTTP requests
 */

const AuthService = require("../services/authService");
const { uploadToCloudinary } = require("../config/cloudinary");

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

  /**
   * PUT /api/auth/profile
   * Update user profile (name and/or avatar image)
   */
  static async updateProfile(req, res, next) {
    try {
      const updateData = {};
      if (req.body.name) updateData.name = req.body.name;

      // If an image file was uploaded, push it to Cloudinary
      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer);
        updateData.avatar = result.url;
      } else if (req.body.avatar) {
        // Accept an emoji/icon string directly
        updateData.avatar = req.body.avatar;
      }

      const user = await AuthService.updateProfile(req.user.id, updateData);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
