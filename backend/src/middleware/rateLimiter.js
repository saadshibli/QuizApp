/**
 * Rate Limiter Middleware
 * Prevents brute force attacks on login endpoint
 */

const rateLimit = require("express-rate-limit");

// Login rate limiter - 20 requests per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: "Too many login attempts, please try again later",
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Only count failed login attempts
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || "15") * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "200"),
  message: "Too many requests from this IP, please try again later",
});

// Answer submission rate limiter - prevents spam answers
const answerLimiter = rateLimit({
  windowMs: 1000, // 1 second window
  max: 3, // max 3 answer submissions per second per IP
  message: "Too many answer submissions, slow down",
  standardHeaders: true,
  legacyHeaders: false,
});

// Session join rate limiter - prevents brute-force code guessing
const joinLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 join attempts per minute per IP
  message: "Too many join attempts, please try again shortly",
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  apiLimiter,
  answerLimiter,
  joinLimiter,
};
