/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 */

const { verifyToken } = require("../config/jwt");

/**
 * Middleware to verify JWT authentication
 */
const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ error: "No authentication token provided" });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Attach user info to request object
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Authentication failed" });
  }
};

/**
 * Middleware to optionally verify JWT authentication
 */
const optionalAuthenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }
  } catch (error) {
    // Ignore error
  }
  next();
};

/**
 * Middleware to check user role
 * @param {string|string[]} roles - Required role(s) (admin, teacher or student)
 */
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const rolesArray = Array.isArray(roles) ? roles : [roles];

    if (!rolesArray.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: `You don't have permission to access this resource` });
    }

    next();
  };
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize,
};
