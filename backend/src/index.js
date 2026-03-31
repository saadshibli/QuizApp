/**
 * Main Server Entry Point
 * Express server with Socket.IO integration
 */
// restart trigger

require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");
const cors = require("cors");

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

// ==================== MIDDLEWARE ====================

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

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

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
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
    // Allow connection but mark as unauthenticated — authenticate event still works as fallback
    socket.userId = null;
    socket.userRole = null;
    return next();
  }
  try {
    const decoded = verifyToken(token);
    if (decoded) {
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.userName = decoded.name || decoded.nickname;
    }
  } catch (err) {
    // Allow connection, authentication can happen via event
  }
  next();
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
  }, 5000);
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
