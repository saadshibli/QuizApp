/**
 * Request Validation Middleware
 * Uses Joi for schema validation
 */

const Joi = require("joi");

/**
 * Validation middleware factory
 * @param {object} schema - Joi validation schema
 * @param {string} source - Where to validate (body, params, query)
 */
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      stripUnknown: true,
      abortEarly: false,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));
      return res.status(400).json({
        error: "Validation failed",
        details,
      });
    }

    // Replace request data with validated data
    req[source] = value;
    next();
  };
};

// Common validation schemas
const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid("teacher", "student").required(),
    avatar: Joi.string().max(255).allow("").optional(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  createQuiz: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().max(1000).allow(""),
    theme: Joi.string()
      .valid(
        "none",
        "light",
        "dark",
        "colorful",
        "space",
        "arctic",
        "biology",
        "chemistry",
        "cyberpunk",
        "english",
        "geography",
        "history",
        "jungle",
        "maths",
        "midnight",
        "physics",
        "sea",
        "sunlight",
        "underwater",
        "volcano",
        "ocean",
        "retro",
        "sunset",
        "forest",
        "galaxy",
        "candy",
        "minimal",
        "neon",
      )
      .default("none"),
    advance_mode: Joi.string().valid("auto", "manual").default("auto"),
    advance_seconds: Joi.number().integer().min(3).max(60).default(5),
  }),

  addQuestion: Joi.object({
    question_text: Joi.string().trim().min(1).max(5000).required(),
    time_limit: Joi.number().integer().min(1).max(300).default(30),
    points: Joi.number().integer().min(1).max(2000).default(100),
  }),

  addOption: Joi.object({
    option_text: Joi.string().trim().min(1).max(1000).required(),
    is_correct: Joi.boolean().default(false),
  }),

  joinSession: Joi.object({
    session_code: Joi.string()
      .trim()
      .pattern(/^\d{6}$/)
      .required()
      .messages({
        "string.pattern.base": "Session code must be exactly 6 digits",
      }),
    nickname: Joi.string().trim().min(2).max(50).required(),
  }),

  startSession: Joi.object({
    quiz_id: Joi.number().integer().positive().required(),
  }),

  submitAnswer: Joi.object({
    question_id: Joi.number().integer().positive().required(),
    option_id: Joi.number().integer().positive().required(),
    response_time: Joi.number().min(0).max(300000).required(),
  }),

  sessionIdParam: Joi.object({
    sessionId: Joi.string().pattern(/^\d+$/).required(),
  }),
};

module.exports = {
  validate,
  schemas,
};
