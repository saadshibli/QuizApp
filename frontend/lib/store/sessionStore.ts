/**
 * Zustand Store - Quiz Session
 * Manage current quiz and session state
 */

import { create } from "zustand";

export interface Question {
  id: number;
  question_text: string;
  time_limit: number;
  points: number;
  options: Array<{
    id: number;
    text: string;
  }>;
}

export interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
}

interface SessionStore {
  sessionId: string | null;
  sessionCode: string | null;
  participantId: number | null;
  status: "Lobby" | "Active" | "Completed" | null;
  currentQuestion: Question | null;
  leaderboard: LeaderboardEntry[];
  userScore: number;
  timeRemaining: number;

  setSession: (
    sessionId: string,
    sessionCode: string,
    participantId: number,
  ) => void;
  setStatus: (status: "Lobby" | "Active" | "Completed") => void;
  setCurrentQuestion: (question: Question) => void;
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  setUserScore: (score: number) => void;
  setTimeRemaining: (time: number) => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  sessionCode: null,
  participantId: null,
  status: null,
  currentQuestion: null,
  leaderboard: [],
  userScore: 0,
  timeRemaining: 0,

  setSession: (sessionId, sessionCode, participantId) =>
    set({ sessionId, sessionCode, participantId }),

  setStatus: (status) => set({ status }),
  setCurrentQuestion: (currentQuestion) => set({ currentQuestion }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setUserScore: (userScore) => set({ userScore }),
  setTimeRemaining: (timeRemaining) => set({ timeRemaining }),

  resetSession: () =>
    set({
      sessionId: null,
      sessionCode: null,
      participantId: null,
      status: null,
      currentQuestion: null,
      leaderboard: [],
      userScore: 0,
      timeRemaining: 0,
    }),
}));
