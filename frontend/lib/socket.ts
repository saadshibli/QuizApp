/**
 * Socket.IO Client
 * Real-time communication with the server
 */

import io, { Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

if (
  !process.env.NEXT_PUBLIC_SOCKET_URL &&
  typeof window !== "undefined" &&
  window.location.protocol === "https:"
) {
  console.warn(
    "NEXT_PUBLIC_SOCKET_URL not set — WebSocket may fail in production",
  );
}

let socket: Socket | null = null;
let currentToken: string | null = null;
let isAuthenticated = false;

/**
 * Initialize Socket.IO connection with authentication.
 * If the socket is already connected with the same token, returns it.
 * If the token changed, disconnects old socket and creates a new one.
 */
export const initializeSocket = (token: string): Socket => {
  // If socket exists with the SAME token (connected OR still connecting), reuse it
  if (socket && currentToken === token) {
    return socket;
  }

  // If socket exists but token changed — clean up old connection
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    isAuthenticated = false;
  }

  currentToken = token;
  isAuthenticated = false;

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    isAuthenticated = false;
    socket?.emit("authenticate", { token: currentToken });
  });

  socket.on("authenticated", () => {
    isAuthenticated = true;
  });

  socket.on("authError", () => {
    isAuthenticated = false;
  });

  socket.on("ServerShuttingDown", () => {
    console.warn("Server is shutting down, will attempt to reconnect...");
  });

  socket.on("connect_error", (err) => {
    if (
      err.message === "Authentication required" ||
      err.message === "Invalid token"
    ) {
      isAuthenticated = false;
    }
  });

  socket.on("error", () => {});

  socket.on("disconnect", () => {
    isAuthenticated = false;
  });

  return socket;
};

/**
 * Wait for the socket to be authenticated.
 * Resolves immediately if already authenticated, otherwise waits for the event.
 */
export const waitForAuth = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isAuthenticated && socket?.connected) {
      resolve();
      return;
    }
    if (!socket) {
      reject(new Error("Socket not initialized"));
      return;
    }
    const onAuth = () => {
      cleanup();
      resolve();
    };
    const onError = (data: any) => {
      cleanup();
      reject(new Error(data?.error || "Auth failed"));
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Auth timeout"));
    }, 8000);
    const cleanup = () => {
      socket?.off("authenticated", onAuth);
      socket?.off("authError", onError);
      clearTimeout(timeout);
    };
    socket.on("authenticated", onAuth);
    socket.on("authError", onError);
  });
};

/**
 * Get existing socket instance
 */
export const getSocket = (): Socket | null => {
  return socket;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

// ==================== SOCKET EVENTS ====================

/**
 * Join a session
 */
export const joinSession = (sessionCode: string, nickname: string) => {
  if (!socket) throw new Error("Socket not initialized");
  socket.emit("JoinSession", { sessionCode, nickname });
};

/**
 * Submit answer to a question
 */
export const submitAnswer = (
  questionId: number,
  optionId: number,
  responseTime: number,
) => {
  if (!socket) throw new Error("Socket not initialized");
  socket.emit("SubmitAnswer", { questionId, optionId, responseTime });
};

/**
 * Broadcast question started (teacher only)
 */
export const broadcastQuestionStarted = (sessionId: string, question: any) => {
  if (!socket) throw new Error("Socket not initialized");
  socket.emit("broadcastQuestionStarted", { sessionId, question });
};

/**
 * Broadcast question ended (teacher only)
 */
export const broadcastQuestionEnded = (
  sessionId: string,
  correctOptionId: number,
) => {
  if (!socket) throw new Error("Socket not initialized");
  socket.emit("broadcastQuestionEnded", { sessionId, correctOptionId });
};

/**
 * Broadcast quiz ended (teacher only)
 */
export const broadcastQuizEnded = (
  sessionId: string,
  finalLeaderboard: any,
) => {
  if (!socket) throw new Error("Socket not initialized");
  socket.emit("broadcastQuizEnded", { sessionId, finalLeaderboard });
};

// ==================== SOCKET LISTENERS ====================
// Each listener function removes any previous listener for the same event
// before registering the new one, preventing duplicate handlers.

/**
 * Safe listener registration: removes previous listener then adds new one.
 * Returns an unsubscribe function for use in React effect cleanup.
 */
function safeOn(event: string, callback: (data: any) => void): () => void {
  if (!socket) throw new Error("Socket not initialized");
  socket.off(event);
  socket.on(event, callback);
  return () => {
    socket?.off(event, callback);
  };
}

export const onParticipantJoined = (callback: (data: any) => void) =>
  safeOn("ParticipantJoined", callback);

export const onSessionJoined = (callback: (data: any) => void) =>
  safeOn("SessionJoined", callback);

export const onQuestionStarted = (callback: (data: any) => void) =>
  safeOn("QuestionStarted", callback);

export const onAnswerResult = (callback: (data: any) => void) =>
  safeOn("AnswerResult", callback);

export const onAnswerSubmitted = (callback: (data: any) => void) =>
  safeOn("AnswerSubmitted", callback);

export const onQuestionEnded = (callback: (data: any) => void) =>
  safeOn("QuestionEnded", callback);

export const onLeaderboardUpdate = (callback: (data: any) => void) =>
  safeOn("LeaderboardUpdate", callback);

export const onQuizEnded = (callback: (data: any) => void) =>
  safeOn("QuizEnded", callback);

export const onAnswerSucceeded = (callback: (data: any) => void) =>
  safeOn("AnswerSucceeded", callback);

/**
 * Unsubscribe from an event
 */
export const offEvent = (eventName: string, callback?: any) => {
  if (!socket) return;
  if (callback) {
    socket.off(eventName, callback);
  } else {
    socket.off(eventName);
  }
};

export default socket;
