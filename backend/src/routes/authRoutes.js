/**
 * Authentication Routes
 * POST /login, /register
 * GET /profile
 */

const express = require("express");
const AuthController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");
const { loginLimiter } = require("../middleware/rateLimiter");
const { upload } = require("../config/cloudinary");

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user (teacher or student)
 * Body: { name, email, password, role }
 */
router.post(
  "/register",
  validate(schemas.register, "body"),
  AuthController.register,
);

/**
 * POST /api/auth/login
 * Login user - rate limited
 * Body: { email, password }
 * Response: { token, user: { id, name, role } }
 */
router.post(
  "/login",
  loginLimiter,
  validate(schemas.login, "body"),
  AuthController.login,
);

/**
 * GET /api/auth/profile
 * Get current user profile - requires authentication
 */
router.get("/profile", authenticate, AuthController.getProfile);

/**
 * PUT /api/auth/profile
 * Update user profile — supports multipart/form-data for avatar upload
 */
router.put(
  "/profile",
  authenticate,
  upload.single("avatar"),
  AuthController.updateProfile,
);

module.exports = router;
