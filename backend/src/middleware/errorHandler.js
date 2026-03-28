/**
 * Error Handler Middleware
 * Centralizes error handling for consistent API responses
 */

const ApiError = require("../utils/ApiError");

const errorHandler = (err, req, res, next) => {
  // Log all errors (but not stack in production)
  if (process.env.NODE_ENV === "production") {
    console.error("[ERROR]", err.message);
  } else {
    console.error("[ERROR]", err);
  }

  // ApiError instances
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      error: err.message,
    });
  }

  // Legacy error objects with { status, message }
  if (err.status && err.message && !(err instanceof Error)) {
    return res.status(err.status).json({
      success: false,
      error: err.message,
    });
  }

  // Database errors
  if (err.code === "23505") {
    return res.status(409).json({
      success: false,
      error: "This record already exists",
    });
  }

  if (err.code === "23503") {
    return res.status(400).json({
      success: false,
      error: "Referenced record does not exist",
    });
  }

  // Joi validation errors
  if (err.details && Array.isArray(err.details)) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: err.details.map((d) => ({
        field: d.context?.label || d.path?.join("."),
        message: d.message,
      })),
    });
  }

  // JSON parse error
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      error: "Invalid JSON in request body",
    });
  }

  // Payload too large
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      error: "Request body too large",
    });
  }

  // Default 500
  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Internal server error",
  });
};

module.exports = errorHandler;
