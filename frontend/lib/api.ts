/**
 * API Client
 * Axios instance with JWT token integration
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import { useAuthStore } from "./store/authStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

if (
  !process.env.NEXT_PUBLIC_API_URL &&
  typeof window !== "undefined" &&
  window.location.protocol === "https:"
) {
  console.warn(
    "NEXT_PUBLIC_API_URL not set — API calls may fail in production",
  );
}

// ==================== Types ====================

export interface QuizOption {
  id: number;
  option_text: string;
  is_correct: boolean;
}

export interface QuizQuestion {
  id: number;
  question_text: string;
  time_limit: number;
  points: number;
  options: QuizOption[];
}

export interface Quiz {
  id: number;
  title: string;
  description?: string;
  theme?: string;
  teacher_id: number;
  questions?: QuizQuestion[];
  created_at?: string;
}

export interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
  total_score?: number;
}

export interface Participant {
  id: number;
  user_id: number;
  nickname: string;
  total_score?: number;
}

export interface Session {
  id: number;
  quiz_id: number;
  teacher_id: number;
  session_code: string;
  status: string;
  current_question: number | null;
  quiz_theme?: string;
  started_at?: string;
}

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const store = useAuthStore.getState();
      // Only auto-logout if the store has hydrated and we actually had a token
      if (store._hasHydrated && store.token) {
        store.logout();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

// ==================== AUTH APIs ====================

export const authAPI = {
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    avatar?: string;
  }) => apiClient.post("/api/auth/register", data),

  login: (data: { email: string; password: string }) =>
    apiClient.post("/api/auth/login", data),

  getProfile: () => apiClient.get("/api/auth/profile"),

  updateProfile: (data: FormData) =>
    apiClient.put("/api/auth/profile", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// ==================== QUIZ APIs ====================

export const quizAPI = {
  createQuiz: (data: any) => apiClient.post("/api/quizzes", data),

  getQuiz: (quizId: string | number) => apiClient.get(`/api/quizzes/${quizId}`),

  getTeacherQuizzes: () => apiClient.get("/api/quizzes"),

  updateQuiz: (quizId: string | number, data: any) =>
    apiClient.put(`/api/quizzes/${quizId}`, data),

  deleteQuiz: (quizId: string | number) =>
    apiClient.delete(`/api/quizzes/${quizId}`),

  addQuestion: (quizId: string | number, data: any) =>
    apiClient.post(`/api/quizzes/${quizId}/questions`, data),

  updateQuestion: (questionId: string | number, data: any) =>
    apiClient.put(`/api/questions/${questionId}`, data),

  deleteQuestion: (questionId: string | number) =>
    apiClient.delete(`/api/questions/${questionId}`),

  addOption: (questionId: string | number, data: any) =>
    apiClient.post(`/api/questions/${questionId}/options`, data),
};

// ==================== SESSION APIs ====================

export const sessionAPI = {
  startSession: (data: { quiz_id: number }) =>
    apiClient.post("/api/sessions/start", data),

  joinSession: (data: { session_code: string; nickname: string }) =>
    apiClient.post("/api/sessions/join", data),

  getSession: (sessionId: string | number) =>
    apiClient.get(`/api/sessions/${sessionId}`),

  getSessionByCode: (code: string) =>
    apiClient.get(`/api/sessions/by-code/${code}`),

  startQuiz: (sessionId: string | number) =>
    apiClient.post(`/api/sessions/${sessionId}/start`),

  nextQuestion: (sessionId: string | number) =>
    apiClient.post(`/api/sessions/${sessionId}/next-question`),

  submitAnswer: (sessionId: string | number, data: any) =>
    apiClient.post(`/api/sessions/${sessionId}/answer`, data),

  getLeaderboard: (sessionId: string | number) =>
    apiClient.get(`/api/sessions/${sessionId}/leaderboard`),

  getQuizHistory: () => apiClient.get("/api/sessions/history"),
};

// ==================== ADMIN APIs ====================

export const adminAPI = {
  getStats: () => apiClient.get("/api/admin/stats"),
  getUsers: () => apiClient.get("/api/admin/users"),
  getQuizzes: () => apiClient.get("/api/admin/quizzes"),
  getSessions: () => apiClient.get("/api/admin/sessions"),
};

export default apiClient;
