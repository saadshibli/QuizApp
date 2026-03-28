/**
 * JWT Configuration and Token Management
 */

const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// In production, JWT_SECRET must be set explicitly
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === "production"
    ? (() => {
        throw new Error("JWT_SECRET must be set in production");
      })()
    : crypto.randomBytes(32).toString("hex"));
const JWT_EXPIRE = process.env.JWT_EXPIRATION || "7d";

/**
 * Generate JWT token
 * @param {object} payload - Token payload (user id, role, etc)
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {object|null} Decoded token or null if invalid
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Decode token without verification (use with caution)
 * @param {string} token - JWT token
 * @returns {object} Decoded token
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
};
