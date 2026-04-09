/**
 * Main Server Entry Point
 * Express server with Socket.IO integration
 */

require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");

// Import routes
const authRoutes = require("./routes/authRoutes");
const quizRoutes = require("./routes/quizRoutes");
const questionRoutes = require("./routes/questionRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Import middleware
const { apiLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");

// Import Socket.IO handlers
const { initializeSocketHandlers } = require("./socket/handlers");

// Import JWT for socket auth
const { verifyToken } = require("./config/jwt");

// Import database setup
const { runMigrations } = require("../database/schema");

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ==================== ENV VALIDATION ====================
if (process.env.NODE_ENV === "production") {
  const required = ["DATABASE_HOST", "JWT_SECRET", "FRONTEND_URL"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
}

// ==================== MIDDLEWARE ====================

// Security headers
app.use(
  helmet({
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    contentSecurityPolicy: false, // CSP managed by frontend framework
    crossOriginEmbedderPolicy: false, // Allow embedded resources (images, etc.)
  }),
);

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

// Request timeout (30s)
app.use((req, res, next) => {
  req.setTimeout(30000);
  next();
});

// Rate limiting
app.use("/api/", apiLimiter);

// Request logging middleware (dev only)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ==================== ROUTES ====================

// Health check endpoints
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

app.get("/health/ready", async (req, res) => {
  try {
    const { pool } = require("./config/database");
    await pool.query("SELECT 1");
    res.json({ status: "ready", db: "ok" });
  } catch (e) {
    res.status(503).json({ status: "not ready", db: "down" });
  }
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/admin", adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// ==================== SOCKET.IO ====================

// Socket.IO connection-level authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token || typeof token !== "string") {
    return next(new Error("Authentication required"));
  }
  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error("Invalid token"));
    }
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    socket.userName = decoded.name || decoded.nickname;
    next();
  } catch (err) {
    next(new Error("Authentication failed"));
  }
});

// Initialize Socket.IO event handlers
initializeSocketHandlers(io);

// ==================== SERVER STARTUP ====================

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Run database migrations
    console.log("Setting up database...");
    await runMigrations();

    // Start server
    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   Real-Time Quiz Platform Backend      ║
╠════════════════════════════════════════╣
║ Server running on port ${PORT}            ║
║ Environment: ${process.env.NODE_ENV || "development"}          ║
║ WebSocket (Socket.IO) enabled          ║
║ Health check: http://localhost:${PORT}/health   ║
╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
function shutdown() {
  console.log("Shutting down gracefully...");

  // Notify all connected socket clients
  io.emit("ServerShuttingDown", { message: "Server is restarting" });

  // Close socket.io first
  io.close(() => {
    console.log("Socket.IO closed");
  });

  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });

  // Force exit if it takes too long
  setTimeout(() => {
    console.error(
      "Could not close connections in time, forcefully shutting down",
    );
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// nodemon specific signal
process.once("SIGUSR2", () => {
  server.close(() => {
    process.kill(process.pid, "SIGUSR2");
  });
});

// Start the server
startServer();

module.exports = { app, server, io };
