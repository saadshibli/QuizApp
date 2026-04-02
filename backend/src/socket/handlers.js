/**
 * Socket.IO Event Handlers
 * Real-time communication for live quiz sessions
 */

const SessionService = require("../services/sessionService");
const SessionRepository = require("../repositories/sessionRepository");
const QuizRepository = require("../repositories/quizRepository");
const { verifyToken } = require("../config/jwt");

// Map to track user connections and active sessions
const connectedUsers = new Map();
const activeSessions = new Map();

// Grace period (ms) added to time limit for answer acceptance (network latency buffer)
const GRACE_MS = 3000;
// Extra buffer before server auto-ends a question if host doesn't
const AUTO_END_BUFFER_MS = 5000;
// Transition delay (ms) before first question timer starts (startup countdown)
const FIRST_QUESTION_DELAY_MS = 5000;

/**
 * Sanitize user input by HTML-encoding special chars
 */
function sanitizeString(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Verify the socket user is the teacher who owns the given session.
 * Looks up teacher_id via the quiz (sessions table has no teacher_id column).
 */
async function verifySessionOwner(socket, sessionId) {
  if (!socket.userId) return false;
  if (socket.userRole !== "teacher") return false;
  const session = await SessionRepository.getSessionById(sessionId);
  if (!session) return false;
  const quiz = await QuizRepository.getQuizById(session.quiz_id);
  if (!quiz) return false;
  return quiz.teacher_id === socket.userId;
}

/**
 * Initialize Socket.IO event handlers
 * @param {object} io - Socket.IO instance
 */
function initializeSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    /**
     * Socket Event: Authenticate
     * Verifies JWT token and establishes user identity
     */
    socket.on("authenticate", (data) => {
      try {
        const token = data.token;
        if (!token || typeof token !== "string") {
          socket.emit("authError", { error: "Invalid token" });
          return;
        }

        const decoded = verifyToken(token);

        if (!decoded) {
          socket.emit("authError", { error: "Invalid token" });
          return;
        }

        // Store user information on socket
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        socket.userName = decoded.name || decoded.nickname;

        // Track connected user
        connectedUsers.set(socket.id, {
          userId: decoded.id,
          role: decoded.role,
          socketId: socket.id,
        });

        socket.emit("authenticated", { success: true });
        // Send server time for client offset calculation
        socket.emit("ServerTime", { serverTime: Date.now() });
        console.log(`[Socket] User ${decoded.id} authenticated`);
      } catch (error) {
        socket.emit("authError", { error: "Authentication failed" });
      }
    });

    /**
     * Socket Event: HostJoinSession
     * Teacher → Server
     * Join the session room as host (no participant created)
     */
    socket.on("HostJoinSession", async (data) => {
      try {
        const { sessionId } = data;

        if (!socket.userId) {
          socket.emit("error", { error: "Not authenticated" });
          return;
        }

        // Only teachers can host sessions
        if (socket.userRole !== "teacher") {
          socket.emit("error", { error: "Only teachers can host sessions" });
          return;
        }

        // Verify this teacher owns the session
        const isOwner = await verifySessionOwner(socket, sessionId);
        if (!isOwner) {
          socket.emit("error", {
            error: "You can only host your own sessions",
          });
          return;
        }

        // Join Socket.IO room for this session
        socket.join(`session:${sessionId}`);
        socket.sessionId = parseInt(sessionId);

        // Get current participants
        const participants = await SessionRepository.getSessionParticipants(
          parseInt(sessionId),
        );

        socket.emit("HostSessionJoined", {
          sessionId: parseInt(sessionId),
          participants: participants || [],
        });

        console.log(
          `[Socket] Teacher ${socket.userId} joined session room ${sessionId} as host`,
        );
      } catch (error) {
        console.error("[Socket] HostJoinSession error:", error);
        socket.emit("error", { error: "Failed to join session as host" });
      }
    });

    /**
     * Socket Event: JoinSession
     * Client → Server
     * Join a quiz session and subscribe to updates
     */
    socket.on("JoinSession", async (data) => {
      try {
        const { sessionCode, nickname } = data;

        if (!socket.userId) {
          socket.emit("error", { error: "Not authenticated" });
          return;
        }

        if (
          !sessionCode ||
          typeof sessionCode !== "string" ||
          sessionCode.length !== 6
        ) {
          socket.emit("error", { error: "Invalid session code" });
          return;
        }

        if (!nickname || typeof nickname !== "string" || nickname.length > 50) {
          socket.emit("error", { error: "Invalid nickname" });
          return;
        }

        // Sanitize nickname
        const sanitizedNickname = sanitizeString(nickname.trim()).slice(0, 50);

        // Get session details
        const session = await SessionRepository.getSessionByCode(sessionCode);

        if (!session) {
          socket.emit("error", { error: "Session not found" });
          return;
        }

        if (session.status === "Completed") {
          socket.emit("error", { error: "Session has already ended" });
          return;
        }

        // Join participant if not already in session
        const participant = await SessionService.joinSession(
          sessionCode,
          socket.userId,
          sanitizedNickname || socket.userName,
        );

        // Store session info on socket
        socket.sessionId = session.id;
        socket.participantId = participant.id;

        // Join Socket.IO room for this session
        socket.join(`session:${session.id}`);

        // Track active session
        if (!activeSessions.has(session.id)) {
          activeSessions.set(session.id, {
            sessionId: session.id,
            sessionCode: session.session_code,
            participants: [],
          });
        }

        const sessionData = activeSessions.get(session.id);
        // Prevent duplicate tracking for the same user
        const alreadyTracked = sessionData.participants.some(
          (p) => p.userId === socket.userId,
        );
        if (!alreadyTracked) {
          sessionData.participants.push({
            socketId: socket.id,
            userId: socket.userId,
            participantId: participant.id,
            nickname: participant.nickname,
          });
        } else {
          // Update socket ID in case of reconnection
          const existing = sessionData.participants.find(
            (p) => p.userId === socket.userId,
          );
          if (existing) existing.socketId = socket.id;
        }

        // Notify all users in the session
        io.to(`session:${session.id}`).emit("ParticipantJoined", {
          participant,
          totalParticipants: sessionData.participants.length,
        });

        socket.emit("SessionJoined", {
          sessionId: session.id,
          sessionCode: session.session_code,
          status: session.status,
        });

        console.log(
          `[Socket] User ${socket.userId} joined session ${session.id}`,
        );
      } catch (error) {
        console.error("[Socket] JoinSession error:", error);
        socket.emit("error", { error: "Failed to join session" });
      }
    });

    /**
     * Socket Event: SubmitAnswer
     * Client → Server
     * Submit an answer to a question
     */
    socket.on("SubmitAnswer", async (data) => {
      try {
        const { questionId, optionId, responseTime } = data;

        if (!socket.sessionId || !socket.participantId) {
          socket.emit("error", { error: "Not in a session" });
          return;
        }

        // Validate data types
        if (
          !Number.isInteger(questionId) ||
          !Number.isInteger(optionId) ||
          typeof responseTime !== "number" ||
          responseTime < 0
        ) {
          socket.emit("error", { error: "Invalid answer data" });
          return;
        }

        // Server-side time enforcement: reject answers after deadline
        const sessionData = activeSessions.get(socket.sessionId);
        if (sessionData?.currentQuestion) {
          const q = sessionData.currentQuestion;
          if (q.id === questionId) {
            const deadline =
              q.questionStartTime + q.timeLimit * 1000 + GRACE_MS;
            if (Date.now() > deadline) {
              socket.emit("error", { error: "Time is up for this question" });
              console.log(
                `[Socket] Rejected late answer from user ${socket.userId} (now=${Date.now()}, deadline=${deadline})`,
              );
              return;
            }
          }
        }

        // Submit answer and get score
        const result = await SessionService.submitAnswer(
          socket.sessionId,
          socket.userId,
          questionId,
          optionId,
          responseTime,
        );

        // Get updated leaderboard
        const leaderboard = await SessionRepository.getLeaderboard(
          socket.sessionId,
        );

        // Notify only the submitting player with their result
        socket.emit("AnswerResult", {
          participantId: socket.participantId,
          nickname: socket.userName,
          isCorrect: result.isCorrect,
          pointsAwarded: result.pointsAwarded,
          optionId: optionId,
        });

        // Broadcast answer stats to the host (teacher) for live tallying
        io.to(`session:${socket.sessionId}`).emit("AnswerSubmitted", {
          participantId: socket.participantId,
          optionId: optionId,
        });

        // Update leaderboard for all participants
        io.to(`session:${socket.sessionId}`).emit("LeaderboardUpdate", {
          leaderboard: leaderboard.map((entry) => ({
            rank: entry.rank,
            nickname: entry.nickname,
            score: entry.total_score,
            totalResponseTime: Number(entry.total_response_time) || 0,
          })),
        });

        socket.emit("AnswerSucceeded", result);

        console.log(
          `[Socket] User ${socket.userId} submitted answer in session ${socket.sessionId}`,
        );
      } catch (error) {
        console.error("[Socket] SubmitAnswer error:", error);
        socket.emit("error", { error: "Failed to submit answer" });
      }
    });

    /**
     * Socket Event: QuestionStarted
     * Server → Client (broadcast to session)
     * Notify all participants that a question has started
     */
    socket.on("broadcastQuestionStarted", async (data) => {
      try {
        const { sessionId, question } = data;

        if (!socket.userId) {
          socket.emit("error", { error: "Not authenticated" });
          return;
        }

        if (
          !sessionId ||
          !question ||
          !question.id ||
          !Array.isArray(question.options)
        ) {
          socket.emit("error", { error: "Invalid question data" });
          return;
        }

        // Verify this teacher owns the session
        const isOwner = await verifySessionOwner(socket, sessionId);
        if (!isOwner) {
          socket.emit("error", {
            error: "Only the session owner can broadcast questions",
          });
          return;
        }

        const now = Date.now();
        const timeLimit = question.time_limit || 30;

        // Track question timing in activeSessions for server-side enforcement
        let sessionData = activeSessions.get(parseInt(sessionId));
        if (!sessionData) {
          sessionData = { sessionId: parseInt(sessionId), participants: [] };
          activeSessions.set(parseInt(sessionId), sessionData);
        }

        // Clear any existing auto-end timer
        if (sessionData.autoEndTimer) {
          clearTimeout(sessionData.autoEndTimer);
          sessionData.autoEndTimer = null;
        }

        const isFirstQuestion = !sessionData.hasStartedFirstQuestion;
        sessionData.hasStartedFirstQuestion = true;

        // questionStartTime = when the question timer actually begins
        // For first question, add delay for the 5s startup countdown
        const questionStartTime = isFirstQuestion
          ? now + FIRST_QUESTION_DELAY_MS
          : now;

        sessionData.currentQuestion = {
          id: question.id,
          questionStartTime: questionStartTime,
          timeLimit: timeLimit,
        };

        // Auto-end safety net: if host doesn't end the question, server does
        const autoEndDelay =
          questionStartTime -
          now +
          timeLimit * 1000 +
          GRACE_MS +
          AUTO_END_BUFFER_MS;
        sessionData.autoEndTimer = setTimeout(() => {
          console.log(
            `[Socket] Auto-ending question ${question.id} in session ${sessionId} (host timeout)`,
          );
          io.to(`session:${sessionId}`).emit("QuestionEnded", {
            correctOptionId: null,
            autoEnded: true,
          });
          if (sessionData.currentQuestion) {
            sessionData.currentQuestion = null;
          }
        }, autoEndDelay);

        io.to(`session:${sessionId}`).emit("QuestionStarted", {
          questionId: question.id,
          questionText: question.question_text,
          options: question.options.map((o) => ({
            id: o.id,
            text: o.option_text,
          })),
          timeLimit: timeLimit,
          points: question.points,
          questionStartTime: questionStartTime,
        });

        console.log(
          `[Socket] Question started in session ${sessionId} (first=${isFirstQuestion}, timeLimit=${timeLimit}s, questionStartTime=${questionStartTime})`,
        );
      } catch (error) {
        console.error("[Socket] broadcastQuestionStarted error:", error);
        socket.emit("error", { error: "Failed to broadcast question" });
      }
    });

    /**
     * Socket Event: QuestionEnded
     * Server → Client (broadcast to session)
     * Notify participants that question time is up
     */
    socket.on("broadcastQuestionEnded", async (data) => {
      try {
        const { sessionId, correctOptionId } = data;

        const isOwner = await verifySessionOwner(socket, sessionId);
        if (!isOwner) {
          socket.emit("error", {
            error: "Only the session owner can end questions",
          });
          return;
        }

        // Clear auto-end timer and current question timing
        const sessionData = activeSessions.get(parseInt(sessionId));
        if (sessionData) {
          if (sessionData.autoEndTimer) {
            clearTimeout(sessionData.autoEndTimer);
            sessionData.autoEndTimer = null;
          }
          sessionData.currentQuestion = null;
        }

        io.to(`session:${sessionId}`).emit("QuestionEnded", {
          correctOptionId,
        });

        console.log(`[Socket] Question ended in session ${sessionId}`);
      } catch (error) {
        console.error("[Socket] broadcastQuestionEnded error:", error);
        socket.emit("error", { error: "Failed to end question" });
      }
    });

    /**
     * Socket Event: QuizEnded
     * Server → Client (broadcast to session)
     * Notify all participants that the quiz has ended
     */
    socket.on("broadcastQuizEnded", async (data) => {
      try {
        const { sessionId, finalLeaderboard } = data;

        const isOwner = await verifySessionOwner(socket, sessionId);
        if (!isOwner) {
          socket.emit("error", {
            error: "Only the session owner can end quizzes",
          });
          return;
        }

        io.to(`session:${sessionId}`).emit("QuizEnded", {
          finalLeaderboard,
        });

        // Clear any pending auto-end timer before removing session
        const endSessionData = activeSessions.get(parseInt(sessionId));
        if (endSessionData?.autoEndTimer) {
          clearTimeout(endSessionData.autoEndTimer);
        }

        // Remove session from active sessions
        activeSessions.delete(parseInt(sessionId));

        console.log(`[Socket] Quiz ended in session ${sessionId}`);
      } catch (error) {
        console.error("[Socket] broadcastQuizEnded error:", error);
        socket.emit("error", { error: "Failed to end quiz" });
      }
    });

    /**
     * Socket Event: disconnect
     * Clean up when user disconnects
     */
    socket.on("disconnect", () => {
      if (socket.sessionId) {
        const sessionData = activeSessions.get(socket.sessionId);

        if (sessionData) {
          // Remove user from session participants
          sessionData.participants = sessionData.participants.filter(
            (p) => p.socketId !== socket.id,
          );

          // Notify remaining participants
          io.to(`session:${socket.sessionId}`).emit("ParticipantLeft", {
            participantId: socket.participantId,
            nickname: socket.userName,
          });

          if (sessionData.participants.length === 0) {
            activeSessions.delete(socket.sessionId);
          }
        }
      }

      // Remove from connected users
      connectedUsers.delete(socket.id);

      console.log(`[Socket] User disconnected: ${socket.id}`);
    });

    /**
     * Socket Event: error handler
     */
    socket.on("error", (error) => {
      console.error("[Socket] Error:", error);
      socket.emit("error", { error: "An error occurred" });
    });
  });
}

module.exports = {
  initializeSocketHandlers,
  connectedUsers,
  activeSessions,
};
