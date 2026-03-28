/**
 * Authentication Service
 * Handles user registration and login business logic
 */

const bcrypt = require("bcrypt");
const UserRepository = require("../repositories/userRepository");
const { generateToken } = require("../config/jwt");
const ApiError = require("../utils/ApiError");

const SALT_ROUNDS = 10;

class AuthService {
  /**
   * Register a new user
   */
  static async register(registerData) {
    const { name, email, password, role } = registerData;

    // Check if user already exists
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      throw ApiError.conflict("User with this email already exists");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await UserRepository.createUser({
      name,
      email,
      passwordHash,
      role,
    });

    // Generate token
    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Login user
   */
  static async login(loginData) {
    const { email, password } = loginData;

    // Find user by email
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  /**
   * Get user profile
   */
  static async getUserProfile(userId) {
    const user = await UserRepository.findById(userId);

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    return user;
  }
}

module.exports = AuthService;
