/**
 * Zustand Store - Authentication
 * Manage user authentication state globally
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { disconnectSocket } from "@/lib/socket";
import { useSessionStore } from "@/lib/store/sessionStore";

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "teacher" | "student";
  avatar?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  _hasHydrated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      _hasHydrated: false,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),

      login: (user, token) => {
        set({ user, token });
        const secure = window.location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Strict${secure}`;
      },

      logout: () => {
        disconnectSocket();
        useSessionStore.getState().resetSession();
        set({ user: null, token: null });
        document.cookie = "token=; Max-Age=0; path=/; SameSite=Strict";
      },

      isAuthenticated: () => {
        const token = get().token;
        return !!token;
      },
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ _hasHydrated: true });
      },
    },
  ),
);

// Force rehydration on client — fixes Next.js App Router SSR issue
// where persist callback never fires because localStorage is unavailable during SSR
if (typeof window !== "undefined") {
  useAuthStore.persist.rehydrate();
}
