/**
 * Custom API Error class for consistent error handling
 */
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }

  static badRequest(message) {
    return new ApiError(400, message);
  }

  static unauthorized(message = "Not authenticated") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Access denied") {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message) {
    return new ApiError(409, message);
  }

  static tooManyRequests(
    message = "Too many requests, please try again later",
  ) {
    return new ApiError(429, message);
  }
}

module.exports = ApiError;
