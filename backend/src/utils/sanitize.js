/**
 * Input Sanitization Utilities
 */

/**
 * Sanitize user input by HTML-encoding special chars
 * @param {string} str - Raw input string
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

module.exports = { sanitizeString };
