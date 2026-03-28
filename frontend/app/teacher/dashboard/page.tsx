"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { quizAPI, sessionAPI } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  PlusCircle,
  Rocket,
  BookOpen,
  Trash2,
  Edit,
  Users,
  Gamepad2,
  Sparkles,
  Clock,
  ChevronLeft,
  ChevronRight,
  Activity,
  Zap,
} from "lucide-react";
import { toast } from "react-hot-toast";
import SpaceBackground from "@/components/SpaceBackground";
import { THEMES } from "@/app/create-quiz/themes";

interface Quiz {
  id: number;
  title: string;
  description: string;
  theme: string;
  created_at: string;
  question_count?: number;
  attempts_count?: number;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!user || user.role !== "teacher") {
      router.push("/login");
      return;
    }
    loadQuizzes();
  }, [user, isMounted, router]);

  const loadQuizzes = async () => {
    try {
      setIsLoading(true);
      const response = await quizAPI.getTeacherQuizzes();
      setQuizzes(response.data);
    } catch (err: any) {
      setError("Failed to load quizzes");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = async (quizId: number) => {
    const loadingId = toast.loading("Creating session...");
    try {
      const response = await sessionAPI.startSession({ quiz_id: quizId });
      toast.success("Session created!", { id: loadingId });
      router.push(`/session/${response.data.code}`);
    } catch (err: any) {
      console.error(err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Failed to start session";
      toast.error(msg, { id: loadingId });
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Helper: Get paginated quizzes
  const paginatedQuizzes = quizzes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Helper: Get total pages
  const totalPages = Math.ceil(quizzes.length / itemsPerPage);

  // Helper: Theme accent styling based on quiz theme text
  const getThemeStyle = (theme: string) => {
    const normalized = (theme || "").toLowerCase();

    const themedFallbacks = [
      {
        banner: "from-pink-500/35 via-fuchsia-500/30 to-purple-500/30",
        cardBg: "from-fuchsia-950/35 via-purple-950/25 to-violet-950/20",
        orbA: "bg-fuchsia-400/24",
        orbB: "bg-violet-400/18",
        patternClass:
          "bg-[radial-gradient(circle_at_18%_24%,rgba(232,121,249,0.18),transparent_45%),radial-gradient(circle_at_82%_70%,rgba(167,139,250,0.16),transparent_44%)]",
        borderBase: "border-fuchsia-300/20",
        borderHover: "hover:border-fuchsia-300/38",
        glow: "shadow-[0_12px_24px_rgba(0,0,0,0.22)] hover:shadow-[0_18px_38px_rgba(217,70,239,0.22)]",
      },
      {
        banner: "from-teal-500/35 via-cyan-500/30 to-sky-500/30",
        cardBg: "from-teal-950/35 via-cyan-950/25 to-sky-950/20",
        orbA: "bg-cyan-400/24",
        orbB: "bg-teal-400/18",
        patternClass:
          "bg-[radial-gradient(circle_at_14%_22%,rgba(45,212,191,0.18),transparent_45%),radial-gradient(circle_at_84%_74%,rgba(56,189,248,0.16),transparent_44%)]",
        borderBase: "border-cyan-300/20",
        borderHover: "hover:border-cyan-300/38",
        glow: "shadow-[0_12px_24px_rgba(0,0,0,0.22)] hover:shadow-[0_18px_38px_rgba(34,211,238,0.2)]",
      },
      {
        banner: "from-amber-500/35 via-orange-500/30 to-rose-500/30",
        cardBg: "from-amber-950/35 via-orange-950/25 to-rose-950/20",
        orbA: "bg-amber-300/24",
        orbB: "bg-rose-400/18",
        patternClass:
          "bg-[radial-gradient(circle_at_18%_20%,rgba(251,191,36,0.18),transparent_45%),radial-gradient(circle_at_82%_74%,rgba(251,113,133,0.15),transparent_44%)]",
        borderBase: "border-amber-300/20",
        borderHover: "hover:border-amber-300/38",
        glow: "shadow-[0_12px_24px_rgba(0,0,0,0.22)] hover:shadow-[0_18px_38px_rgba(251,146,60,0.2)]",
      },
    ];

    const pickFallback = () => {
      const hash = normalized
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return themedFallbacks[hash % themedFallbacks.length];
    };

    if (!normalized || normalized === "default" || normalized === "light") {
      return {
        banner: "from-slate-400/35 via-slate-500/30 to-indigo-500/30",
        cardBg: "from-slate-900/35 via-slate-900/22 to-indigo-950/18",
        orbA: "bg-slate-300/18",
        orbB: "bg-indigo-300/16",
        patternClass:
          "bg-[radial-gradient(circle_at_20%_20%,rgba(148,163,184,0.14),transparent_45%),radial-gradient(circle_at_82%_78%,rgba(99,102,241,0.12),transparent_42%)]",
        borderBase: "border-slate-300/16",
        borderHover: "hover:border-slate-200/30",
        glow: "shadow-[0_12px_24px_rgba(0,0,0,0.22)] hover:shadow-[0_16px_32px_rgba(71,85,105,0.2)]",
      };
    }

    if (normalized.includes("space") || normalized.includes("galaxy")) {
      return {
        banner: "from-indigo-500/35 via-purple-500/30 to-fuchsia-500/30",
        cardBg: "from-indigo-950/35 via-violet-950/25 to-fuchsia-950/20",
        orbA: "bg-indigo-400/25",
        orbB: "bg-fuchsia-400/20",
        patternClass:
          "bg-[radial-gradient(circle_at_18%_20%,rgba(129,140,248,0.18),transparent_46%),radial-gradient(circle_at_82%_26%,rgba(232,121,249,0.16),transparent_42%)]",
        borderBase: "border-indigo-300/20",
        borderHover: "hover:border-fuchsia-300/40",
        glow: "shadow-[0_12px_24px_rgba(0,0,0,0.22)] hover:shadow-[0_18px_38px_rgba(168,85,247,0.23)]",
      };
    }
    if (normalized.includes("ocean") || normalized.includes("water")) {
      return {
        banner: "from-cyan-500/35 via-sky-500/30 to-blue-500/30",
        cardBg: "from-cyan-950/35 via-sky-950/25 to-blue-950/20",
        orbA: "bg-cyan-400/25",
        orbB: "bg-blue-400/20",
        patternClass:
          "bg-[radial-gradient(circle_at_15%_24%,rgba(34,211,238,0.2),transparent_45%),radial-gradient(circle_at_84%_76%,rgba(59,130,246,0.16),transparent_44%)]",
        borderBase: "border-cyan-300/20",
        borderHover: "hover:border-cyan-300/40",
        glow: "shadow-[0_12px_24px_rgba(0,0,0,0.22)] hover:shadow-[0_18px_38px_rgba(34,211,238,0.2)]",
      };
    }
    if (
      normalized.includes("fire") ||
      normalized.includes("lava") ||
      normalized.includes("volcano") ||
      normalized.includes("inferno")
    ) {
      return {
        banner: "from-orange-500/35 via-rose-500/30 to-red-500/30",
        cardBg: "from-orange-950/35 via-rose-950/25 to-red-950/20",
        orbA: "bg-orange-300/26",
        orbB: "bg-rose-400/20",
        patternClass:
          "bg-[radial-gradient(circle_at_16%_22%,rgba(251,146,60,0.2),transparent_45%),radial-gradient(circle_at_84%_74%,rgba(251,113,133,0.16),transparent_44%)]",
        borderBase: "border-orange-300/20",
        borderHover: "hover:border-rose-300/40",
        glow: "shadow-[0_12px_24px_rgba(0,0,0,0.22)] hover:shadow-[0_18px_38px_rgba(251,113,133,0.22)]",
      };
    }
    if (normalized.includes("forest") || normalized.includes("nature")) {
      return {
        banner: "from-emerald-500/35 via-green-500/30 to-lime-500/30",
        cardBg: "from-emerald-950/35 via-green-950/25 to-lime-950/20",
        orbA: "bg-emerald-400/22",
        orbB: "bg-lime-400/18",
        patternClass:
          "bg-[radial-gradient(circle_at_22%_22%,rgba(16,185,129,0.2),transparent_45%),radial-gradient(circle_at_78%_72%,rgba(132,204,22,0.16),transparent_44%)]",
        borderBase: "border-emerald-300/20",
        borderHover: "hover:border-lime-300/40",
        glow: "shadow-[0_12px_24px_rgba(0,0,0,0.22)] hover:shadow-[0_18px_38px_rgba(52,211,153,0.22)]",
      };
    }

    return pickFallback();
  };

  const shouldShowThemeBadge = (theme: string) => {
    const normalized = (theme || "").trim().toLowerCase();
    return normalized.length > 0 && normalized !== "default";
  };

  const resolveEffectiveTheme = (quiz: Quiz) => {
    const rawTheme = (quiz.theme || "").trim().toLowerCase();
    if (
      rawTheme &&
      rawTheme !== "none" &&
      rawTheme !== "default" &&
      rawTheme !== "light"
    ) {
      return rawTheme;
    }

    const text = `${quiz.title || ""} ${quiz.description || ""}`.toLowerCase();
    if (text.includes("math")) return "maths";
    if (text.includes("geo")) return "geography";
    if (text.includes("history")) return "history";
    if (text.includes("physics")) return "physics";
    if (text.includes("chem")) return "chemistry";
    if (text.includes("bio")) return "biology";
    if (
      text.includes("ocean") ||
      text.includes("sea") ||
      text.includes("water")
    )
      return "ocean";
    if (
      text.includes("forest") ||
      text.includes("jungle") ||
      text.includes("nature")
    )
      return "forest";
    if (
      text.includes("fire") ||
      text.includes("lava") ||
      text.includes("volcano")
    )
      return "volcano";
    if (text.includes("space") || text.includes("galaxy")) return "space";

    return rawTheme || "none";
  };

  if (!isMounted) return null;

  return (
    <div className="space-bg min-h-screen !overflow-y-auto !overflow-x-hidden">
      <SpaceBackground />

      {/* Delete Modal */}
      {quizToDelete !== null && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="cartoon-panel p-6 max-w-sm w-full"
          >
            <h3 className="text-lg font-bold text-white mb-2">Delete Quiz?</h3>
            <p className="text-[#a8a3c7] text-sm mb-6">
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <motion.button
                type="button"
                onClick={() => setQuizToDelete(null)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="btn-cartoon btn-cartoon-outline px-4 py-2 text-sm rounded-xl"
              >
                Cancel
              </motion.button>
              <motion.button
                type="button"
                onClick={async () => {
                  try {
                    await quizAPI.deleteQuiz(quizToDelete);
                    toast.success("Quiz deleted");
                    setQuizToDelete(null);
                    loadQuizzes();
                  } catch (err: any) {
                    toast.error("Failed to delete quiz");
                    console.error(err);
                  }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="btn-cartoon btn-cartoon-danger flex items-center gap-2 px-4 py-2 text-sm rounded-xl shadow-lg shadow-red-500/30"
              >
                <motion.div
                  whileHover={{ rotate: -15, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.div>
                Delete
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="relative z-10 w-full">
        {/* HEADER SECTION */}
        <motion.header
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-white/5 bg-[#0a0920]/40 backdrop-blur-sm"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-black font-display tracking-tight text-white">
                My Dashboard
              </h1>
              <p className="text-[#a8a3c7] text-sm mt-1">
                Welcome back, {user?.name}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href="/create-quiz"
                  className="btn-cartoon btn-cartoon-pink flex items-center gap-2 py-3 px-6 rounded-xl text-sm font-bold transition-all duration-300 group"
                >
                  <motion.div
                    className="relative"
                    whileHover={{ rotate: 15, scale: 1.2 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="absolute inset-0 bg-pink-400/20 rounded-lg blur-lg group-hover:blur-xl transition-all"></div>
                    <PlusCircle className="w-5 h-5 relative" />
                  </motion.div>
                  <span className="hidden sm:inline">Create Quiz</span>
                </Link>
              </motion.div>
              <motion.button
                type="button"
                onClick={handleLogout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="btn-cartoon btn-cartoon-outline p-3 rounded-xl hover:bg-white/10 hover:border-white/30 transition-all duration-300 group"
                title="Logout"
              >
                <motion.div
                  whileHover={{ rotate: -15, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <LogOut className="w-5 h-5" />
                </motion.div>
              </motion.button>
            </div>
          </div>
        </motion.header>

        {/* STATS SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className=""
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  icon: <BookOpen className="w-8 h-8" />,
                  label: "Total Quizzes",
                  value: quizzes.length,
                  gradient: "from-purple-500/20 to-indigo-600/20",
                  iconBg: "bg-purple-500/30",
                  borderColor: "border-purple-500/30",
                  iconColor: "text-purple-300",
                  glowColor: "shadow-lg shadow-purple-500/30",
                },
                {
                  icon: <Activity className="w-8 h-8" />,
                  label: "Total Questions",
                  value: quizzes.reduce(
                    (sum, q) => sum + (q.question_count || 0),
                    0,
                  ),
                  gradient: "from-cyan-500/20 to-blue-600/20",
                  iconBg: "bg-cyan-500/30",
                  borderColor: "border-cyan-500/30",
                  iconColor: "text-cyan-300",
                  glowColor: "shadow-lg shadow-cyan-500/30",
                },
                {
                  icon: <Zap className="w-8 h-8" />,
                  label: "Total Plays",
                  value: quizzes.reduce(
                    (sum, q) => sum + (q.attempts_count || 0),
                    0,
                  ),
                  gradient: "from-amber-500/20 to-orange-600/20",
                  iconBg: "bg-amber-500/30",
                  borderColor: "border-amber-500/30",
                  iconColor: "text-amber-300",
                  glowColor: "shadow-lg shadow-amber-500/30",
                },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + idx * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  className={`rounded-2xl p-6 border ${stat.borderColor} bg-gradient-to-br ${stat.gradient} flex items-center gap-4 hover:border-white/30 transition-all duration-300 group`}
                >
                  <motion.div
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className={`p-4 rounded-xl ${stat.iconBg} flex-shrink-0 border ${stat.borderColor} ${stat.glowColor} backdrop-blur-sm`}
                  >
                    <div className={`${stat.iconColor}`}>{stat.icon}</div>
                  </motion.div>
                  <div>
                    <p className="text-[#a8a3c7] text-xs font-semibold uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-black text-white font-display mt-1">
                      {stat.value}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* MAIN CONTENT SECTION */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-16">
          {/* Section header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                Your Quizzes
                <span className="text-lg bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent font-display">
                  {quizzes.length}
                </span>
              </h2>
              <p className="text-[#a8a3c7] text-sm mt-1">
                Manage and host your quizzes
              </p>
            </div>
          </div>

          {/* Quiz Card Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-3 border-purple-500/20 border-t-pink-500 rounded-full animate-spin" />
              <p className="text-[#a8a3c7] text-sm font-medium">
                Loading your quizzes...
              </p>
            </div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="backdrop-blur-sm rounded-2xl p-8 border border-red-500/20 bg-red-500/5 text-center"
            >
              <p className="text-red-300 text-sm font-medium">{error}</p>
            </motion.div>
          ) : quizzes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="backdrop-blur-sm rounded-2xl p-12 border border-white/5 bg-gradient-to-br from-white/5 to-white/[0.02] text-center"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center border-2 border-purple-500/40 shadow-lg shadow-purple-500/20"
              >
                <BookOpen className="w-12 h-12 text-purple-300" />
              </motion.div>
              <h3 className="text-2xl font-display font-bold text-white mb-2">
                No quizzes created yet
              </h3>
              <p className="text-[#a8a3c7] mb-8 max-w-md mx-auto text-sm leading-relaxed">
                Start by creating your first quiz. Invite your students to join
                and begin an interactive learning experience.
              </p>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href="/create-quiz"
                  className="btn-cartoon btn-cartoon-pink inline-flex items-center gap-2 py-3 px-6 rounded-xl text-sm font-bold transition-all group"
                >
                  <motion.div
                    className="relative"
                    whileHover={{ rotate: 15, scale: 1.2 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="absolute inset-0 bg-pink-400/20 rounded-lg blur-lg" />
                    <PlusCircle className="w-4 h-4 relative" />
                  </motion.div>
                  Create Your First Quiz
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {paginatedQuizzes.map((quiz, idx) => {
                    const effectiveTheme = resolveEffectiveTheme(quiz);
                    const themeStyle = getThemeStyle(
                      effectiveTheme || "default",
                    );
                    const themeConfig = THEMES[effectiveTheme] || THEMES.none;
                    const showThemeBadge = shouldShowThemeBadge(effectiveTheme);
                    const themeLabel = showThemeBadge
                      ? themeConfig?.name ||
                        (effectiveTheme || "default").trim()
                      : "Neutral";

                    return (
                      <motion.article
                        key={quiz.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        whileHover={{ y: -4 }}
                        className={`group relative rounded-2xl border border-transparent bg-gradient-to-br ${themeStyle.cardBg} backdrop-blur-sm overflow-hidden ${themeStyle.glow} ${themeStyle.borderHover} transition-[border-color,box-shadow] duration-300 flex flex-col`}
                      >
                        {themeConfig?.image && showThemeBadge && (
                          <Image
                            src={themeConfig.image}
                            alt={themeLabel}
                            fill
                            className="absolute inset-0 object-cover opacity-40 saturate-130 contrast-110"
                            unoptimized
                          />
                        )}
                        <div
                          className={`absolute inset-0 opacity-48 ${themeStyle.patternClass}`}
                        />
                        <div
                          className={`absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl ${themeStyle.orbA}`}
                        />
                        <div
                          className={`absolute -bottom-10 -left-8 w-24 h-24 rounded-full blur-2xl ${themeStyle.orbB}`}
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.38),rgba(2,6,23,0.32),rgba(2,6,23,0.56))]" />
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[linear-gradient(110deg,transparent_15%,rgba(255,255,255,0.05)_45%,transparent_75%)]" />

                        <div
                          className={`relative z-10 h-9 w-full bg-gradient-to-r ${themeStyle.banner} px-3 flex items-center`}
                        >
                          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/95">
                            {themeLabel} Theme
                          </span>
                        </div>

                        <div className="relative z-10 p-5 pb-5 flex flex-col flex-1">
                          <div className="absolute right-3 top-3 text-[42px] leading-none font-black uppercase text-white/7 pointer-events-none select-none">
                            {(showThemeBadge ? themeLabel : "N").charAt(0)}
                          </div>

                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-lg font-black text-white leading-tight line-clamp-2 tracking-tight">
                                {quiz.title}
                              </h3>
                              <p className="text-xs text-white/72 mt-1">
                                Created{" "}
                                {new Date(quiz.created_at).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-2 mb-2 min-h-[20px]">
                            {typeof quiz.question_count === "number" && (
                              <span className="px-2 py-1 rounded-md text-[11px] font-semibold text-cyan-200 bg-cyan-500/15 border border-cyan-400/25">
                                {quiz.question_count} Qs
                              </span>
                            )}
                            {typeof quiz.attempts_count === "number" && (
                              <span className="px-2 py-1 rounded-md text-[11px] font-semibold text-amber-200 bg-amber-500/15 border border-amber-400/25">
                                {quiz.attempts_count} Attempts
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-white/86 leading-relaxed line-clamp-2 mb-3">
                            {quiz.description || "No description added yet."}
                          </p>

                          <div className="mt-auto pt-4 space-y-2.5">
                            <motion.button
                              type="button"
                              onClick={() => handleStartSession(quiz.id)}
                              whileHover={{ scale: 1.02, y: -1 }}
                              whileTap={{ scale: 0.97 }}
                              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-extrabold bg-gradient-to-r from-emerald-500/60 via-green-500/50 to-teal-500/50 hover:from-emerald-400/70 hover:via-green-400/60 hover:to-teal-400/60 text-emerald-50 transition-all shadow-[0_8px_16px_rgba(16,185,129,0.16)]"
                            >
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50/15">
                                <Rocket className="w-3.5 h-3.5" />
                              </span>
                              Host Quiz
                            </motion.button>

                            <div className="grid grid-cols-2 gap-2">
                              <motion.button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/create-quiz/builder?quizId=${quiz.id}`,
                                  )
                                }
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.97 }}
                                className={`inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold bg-gradient-to-r ${themeStyle.banner} text-white transition-all shadow-[0_6px_12px_rgba(2,6,23,0.26)]`}
                              >
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20">
                                  <Edit className="w-3.5 h-3.5" />
                                </span>
                                Edit
                              </motion.button>

                              <motion.button
                                type="button"
                                onClick={() => setQuizToDelete(quiz.id)}
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.97 }}
                                className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-rose-600/75 to-red-600/75 hover:from-rose-500/90 hover:to-red-500/90 text-white transition-all shadow-[0_6px_12px_rgba(190,24,93,0.24)]"
                              >
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/18">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </span>
                                Delete
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center justify-between mt-8 px-6 py-4 backdrop-blur-sm rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.04] to-white/[0.02]"
                >
                  <p className="text-sm text-[#a8a3c7]">
                    Showing{" "}
                    <span className="font-semibold text-white">
                      {(currentPage - 1) * itemsPerPage + 1}
                    </span>
                    -
                    <span className="font-semibold text-white">
                      {Math.min(currentPage * itemsPerPage, quizzes.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-white">
                      {quizzes.length}
                    </span>
                  </p>

                  <div className="flex items-center gap-2">
                    <motion.button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      whileHover={
                        currentPage !== 1 ? { scale: 1.1, rotate: -10 } : {}
                      }
                      whileTap={currentPage !== 1 ? { scale: 0.95 } : {}}
                      className="p-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-purple-300 hover:text-purple-200 border border-purple-500/40 transition-all flex items-center justify-center shadow-md shadow-purple-500/10"
                      title="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </motion.button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <motion.button
                          key={idx}
                          type="button"
                          onClick={() => setCurrentPage(idx + 1)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                            currentPage === idx + 1
                              ? "bg-purple-500/40 border-2 border-purple-500/60 text-purple-200 shadow-lg shadow-purple-500/20"
                              : "bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-purple-200"
                          }`}
                        >
                          {idx + 1}
                        </motion.button>
                      ))}
                    </div>

                    <motion.button
                      type="button"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      whileHover={
                        currentPage !== totalPages
                          ? { scale: 1.1, rotate: 10 }
                          : {}
                      }
                      whileTap={
                        currentPage !== totalPages ? { scale: 0.95 } : {}
                      }
                      className="p-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-purple-300 hover:text-purple-200 border border-purple-500/40 transition-all flex items-center justify-center shadow-md shadow-purple-500/10"
                      title="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
