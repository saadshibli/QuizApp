"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { sessionAPI } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  LogOut,
  Zap,
  Trophy,
  Gamepad2,
  Target,
  Users,
  Clock,
  ChevronRight,
  History,
  Award,
  Star,
  Flame,
  BarChart3,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import SpaceBackground, { CartoonRocket } from "@/components/SpaceBackground";

// Stat card component (hooks must be at component top level, not inside .map())
function StatCard({
  label,
  value,
  suffix,
  prefix,
  icon,
  glowColor,
  index,
}: {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  icon: React.ReactNode;
  glowColor: string;
  index: number;
}) {
  const [animVal, setAnimVal] = useState(0);
  useEffect(() => {
    if (value === 0) {
      setAnimVal(0);
      return;
    }
    const duration = 1000 + index * 200;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimVal(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, index]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -3, scale: 1.03 }}
      className="cartoon-panel p-2.5 sm:p-3.5 relative overflow-hidden group cursor-default"
      style={{ boxShadow: `0 4px 20px ${glowColor}` }}
    >
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit]"
        style={{
          background: `radial-gradient(circle at center, ${glowColor}, transparent 70%)`,
        }}
      />
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5 relative">
        <motion.div
          whileHover={{ rotate: 15, scale: 1.15 }}
          className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/[0.06]"
        >
          {icon}
        </motion.div>
        <span className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-wider truncate">
          {label}
        </span>
      </div>
      <p className="text-lg sm:text-xl font-black text-white relative">
        {value === 0 && label === "Best Rank"
          ? "—"
          : `${prefix || ""}${animVal.toLocaleString()}${suffix || ""}`}
      </p>
    </motion.div>
  );
}

export default function StudentDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [sessionCode, setSessionCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [invalidCode, setInvalidCode] = useState(false);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isGuest = user?.email?.includes("@guest.local");

  // Fetch quiz history for logged-in students
  useEffect(() => {
    if (!user) return;
    if (isGuest) return;
    setHistoryLoading(true);
    sessionAPI
      .getQuizHistory()
      .then((res) => setQuizHistory(res.data || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [user, isGuest]);

  // Derived stats for logged-in students
  const stats = useMemo(() => {
    if (!quizHistory.length)
      return { played: 0, totalScore: 0, bestRank: null, accuracy: 0 };
    const played = quizHistory.length;
    const totalScore = quizHistory.reduce(
      (sum: number, h: any) => sum + (h.score || h.total_score || 0),
      0,
    );
    const ranks = quizHistory
      .filter((h: any) => h.rank)
      .map((h: any) => h.rank);
    const bestRank = ranks.length ? Math.min(...ranks) : null;
    const totalCorrect = quizHistory.reduce(
      (sum: number, h: any) => sum + (h.correct_answers || 0),
      0,
    );
    const totalAnswered = quizHistory.reduce(
      (sum: number, h: any) => sum + (h.questions_answered || 0),
      0,
    );
    const accuracy =
      totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    return { played, totalScore, bestRank, accuracy };
  }, [quizHistory]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInvalidCode(false);
    setIsLoading(true);

    try {
      const response = await sessionAPI.joinSession({
        session_code: sessionCode.toUpperCase(),
        nickname: nickname || user?.name || "Student",
      });
      router.replace(
        `/quiz-player/${response.data.session_code || sessionCode.toUpperCase()}`,
      );
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to join session",
      );
      setInvalidCode(true);
      setIsLoading(false);
    }
  };

  const codeChars = sessionCode.padEnd(6, " ").split("").slice(0, 6);
  const codeStatus = invalidCode
    ? "invalid"
    : sessionCode.length === 0
      ? "empty"
      : sessionCode.length < 6
        ? "partial"
        : "valid";

  useEffect(() => {
    if (invalidCode) setInvalidCode(false);
    if (error) setError("");
  }, [sessionCode]);

  // ============ GUEST EXPERIENCE — minimal, join-only ============
  if (isGuest) {
    return (
      <div className="space-bg min-h-screen flex flex-col">
        <SpaceBackground />
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-5 flex flex-col items-center"
          >
            <div className="mb-3">
              <CartoonRocket className="w-[70px] h-[70px]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black font-display tracking-tight">
              <span className="bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                Jump In!
              </span>
            </h1>
            <p className="text-[#a8a3c7] text-sm mt-1">
              Enter your{" "}
              <span className="text-white/80 font-semibold">6-digit code</span>{" "}
              to join a live game
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="cartoon-panel p-5 sm:p-6 w-full max-w-xl relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

            <form onSubmit={handleJoinSession} className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm font-medium flex items-center gap-2"
                >
                  <span>&#9888;&#65039;</span>
                  {error}
                </motion.div>
              )}
              {renderCodeBoxes()}
              <div>
                <label className="text-xs font-bold text-[#6b6590] uppercase tracking-wider mb-2 block">
                  Nickname{" "}
                  <span className="font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onFocus={() => setFocusedInput("name")}
                  onBlur={() => setFocusedInput(null)}
                  className={`w-full h-12 px-4 rounded-xl bg-white/[0.07] border-2 border-white/20 text-white placeholder:text-white/40 outline-none transition-all ${
                    focusedInput === "name"
                      ? "border-cyan-300/70 shadow-[0_0_0_3px_rgba(34,211,238,0.14),0_0_24px_rgba(34,211,238,0.16)]"
                      : ""
                  }`}
                  placeholder="Enter your nickname"
                  disabled={isLoading}
                />
              </div>
              {renderJoinButton()}
            </form>
          </motion.div>

          <p className="text-white/30 text-xs mt-5">
            Want to track your scores?{" "}
            <button
              onClick={() => {
                logout();
                router.replace("/register");
              }}
              className="text-cyan-400 hover:underline font-semibold"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ============ LOGGED-IN STUDENT — full dashboard ============
  return (
    <div className="space-bg min-h-screen flex flex-col">
      <SpaceBackground />

      {/* Compact top bar */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center justify-between px-3 sm:px-8 pt-4 sm:pt-5 pb-2"
      >
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <Link href="/profile">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-white/15 overflow-hidden cursor-pointer flex-shrink-0"
            >
              {user?.avatar && user.avatar.startsWith("http") ? (
                <Image src={user.avatar} alt="" width={40} height={40} className="w-full h-full object-cover" />
              ) : user?.avatar ? (
                <span className="text-xl leading-none">{user.avatar}</span>
              ) : (
                <Gamepad2 className="w-5 h-5 text-white" />
              )}
            </motion.div>
          </Link>
          <div>
            <p className="text-sm font-bold text-white font-display flex items-center gap-1.5">
              Player Hub
              <Sparkles className="w-3.5 h-3.5 text-amber-400/70" />
            </p>
            <p className="text-[11px] text-[#6b6590]">Hey, {user?.name}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="btn-cartoon btn-cartoon-outline flex items-center gap-2 py-2 px-3 rounded-xl text-xs"
          title="Logout"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </motion.header>

      <div className="relative z-10 flex-1 flex flex-col px-3 sm:px-6 lg:px-8 pb-6 pt-2 max-w-6xl mx-auto w-full">
        {/* Stats Row */}
        {quizHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5"
          >
            {[
              {
                label: "Quizzes Played",
                value: stats.played,
                suffix: "",
                icon: <Gamepad2 className="w-4 h-4 text-cyan-400" />,
                color: "cyan",
                glowColor: "rgba(34,211,238,0.15)",
                borderColor: "rgba(34,211,238,0.2)",
              },
              {
                label: "Total Score",
                value: stats.totalScore,
                suffix: "",
                icon: <TrendingUp className="w-4 h-4 text-amber-400" />,
                color: "amber",
                glowColor: "rgba(251,191,36,0.15)",
                borderColor: "rgba(251,191,36,0.2)",
              },
              {
                label: "Accuracy",
                value: stats.accuracy,
                suffix: "%",
                icon: <Target className="w-4 h-4 text-emerald-400" />,
                color: "emerald",
                glowColor: "rgba(16,185,129,0.15)",
                borderColor: "rgba(16,185,129,0.2)",
              },
              {
                label: "Best Rank",
                value: stats.bestRank || 0,
                prefix: "#",
                icon: <Trophy className="w-4 h-4 text-pink-400" />,
                color: "pink",
                glowColor: "rgba(236,72,153,0.15)",
                borderColor: "rgba(236,72,153,0.2)",
              },
            ].map((s, i) => (
              <StatCard
                key={i}
                label={s.label}
                value={s.value}
                suffix={s.suffix}
                prefix={s.prefix}
                icon={s.icon}
                glowColor={s.glowColor}
                index={i}
              />
            ))}
          </motion.div>
        )}

        {/* Main content: two columns on desktop */}
        <div className="flex flex-col lg:flex-row gap-5 flex-1">
          {/* Left: Quick Join */}
          <div className="lg:flex-[1.1]">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="cartoon-panel p-5 sm:p-6 relative overflow-hidden h-full flex flex-col"
            >
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

              <div className="text-center mb-4">
                <div className="mb-2 inline-block">
                  <CartoonRocket className="w-[50px] h-[50px]" />
                </div>
                <h2 className="text-2xl font-black font-display">
                  <span className="bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                    Quick Join
                  </span>
                </h2>
                <p className="text-[#a8a3c7] text-xs mt-0.5">
                  Enter your 6-digit code and jump in
                </p>
              </div>

              <form
                onSubmit={handleJoinSession}
                className="space-y-4 flex-1 flex flex-col"
              >
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm font-medium flex items-center gap-2"
                  >
                    <span>&#9888;&#65039;</span>
                    {error}
                  </motion.div>
                )}
                {renderCodeBoxes()}
                <div>
                  <label className="text-xs font-bold text-[#6b6590] uppercase tracking-wider mb-2 block">
                    Nickname{" "}
                    <span className="font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    onFocus={() => setFocusedInput("name")}
                    onBlur={() => setFocusedInput(null)}
                    className={`w-full h-12 px-4 rounded-xl bg-white/[0.07] border-2 border-white/20 text-white placeholder:text-white/40 outline-none transition-all ${
                      focusedInput === "name"
                        ? "border-cyan-300/70 shadow-[0_0_0_3px_rgba(34,211,238,0.14),0_0_24px_rgba(34,211,238,0.16)]"
                        : ""
                    }`}
                    placeholder="Enter your nickname"
                    disabled={isLoading}
                  />
                </div>
                <div className="mt-auto">{renderJoinButton()}</div>
              </form>
            </motion.div>
          </div>

          {/* Right: Quiz History */}
          <div className="lg:flex-[1]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="cartoon-panel p-5 sm:p-6 relative overflow-hidden h-full flex flex-col"
            >
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2 font-display">
                  <History className="w-5 h-5 text-amber-400" />
                  Recent Games
                </h2>
                {quizHistory.length > 0 && (
                  <span className="text-xs font-bold text-white/40 bg-white/[0.06] px-2.5 py-1 rounded-lg border border-white/10">
                    {quizHistory.length} played
                  </span>
                )}
              </div>

              {historyLoading ? (
                <div className="flex items-center justify-center py-8 flex-1">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
                </div>
              ) : quizHistory.length === 0 ? (
                <div className="text-center py-8 flex-1 flex flex-col items-center justify-center">
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="w-14 h-14 mx-auto rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-3"
                  >
                    <Trophy className="w-7 h-7 text-white/20" />
                  </motion.div>
                  <p className="text-white/40 text-sm font-medium">
                    No quiz history yet
                  </p>
                  <p className="text-white/25 text-xs mt-1">
                    Join a quiz to see your results here
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 flex-1 scrollbar-thin">
                  <AnimatePresence>
                    {quizHistory.map((h: any, i: number) => (
                      <motion.div
                        key={h.session_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ scale: 1.01, x: 4 }}
                        className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.18] transition-all cursor-default relative overflow-hidden"
                      >
                        {/* Hover glow */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-amber-500/5 via-transparent to-purple-500/5 pointer-events-none" />

                        {/* Rank badge */}
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm border shrink-0 relative ${
                            h.rank === 1
                              ? "bg-amber-500/20 border-amber-400/40 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)]"
                              : h.rank === 2
                                ? "bg-slate-400/15 border-slate-300/30 text-slate-300"
                                : h.rank === 3
                                  ? "bg-amber-700/20 border-amber-600/30 text-amber-500"
                                  : "bg-white/[0.04] border-white/10 text-white/50"
                          }`}
                        >
                          {h.rank ? (
                            h.rank <= 3 ? (
                              <span className="text-base">
                                {["🥇", "🥈", "🥉"][h.rank - 1]}
                              </span>
                            ) : (
                              `#${h.rank}`
                            )
                          ) : (
                            "-"
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 relative">
                          <p className="text-white font-bold text-xs sm:text-sm truncate group-hover:text-white/95">
                            {h.quiz_title || "Quiz"}
                          </p>
                          <div className="flex items-center gap-2 sm:gap-3 mt-0.5 flex-wrap">
                            <span className="text-white/35 text-[11px] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {h.started_at
                                ? new Date(h.started_at).toLocaleDateString()
                                : "—"}
                            </span>
                            <span className="text-white/35 text-[11px] flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              {h.correct_answers}/{h.questions_answered}
                            </span>
                            <span className="text-white/35 text-[11px] flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {h.total_players}
                            </span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right shrink-0 relative">
                          <p className="font-black text-sm bg-gradient-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent">
                            {h.score || h.total_score || 0}
                          </p>
                          <p className="text-[10px] text-white/30 font-bold">
                            pts
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Features strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5"
        >
          {[
            {
              icon: <Zap className="w-4 h-4 text-amber-400" />,
              title: "Join in seconds",
              glow: "rgba(251,191,36,0.1)",
            },
            {
              icon: <Target className="w-4 h-4 text-pink-400" />,
              title: "Smart accuracy",
              glow: "rgba(236,72,153,0.1)",
            },
            {
              icon: <Users className="w-4 h-4 text-cyan-400" />,
              title: "Live players",
              glow: "rgba(34,211,238,0.1)",
            },
            {
              icon: <Trophy className="w-4 h-4 text-green-400" />,
              title: "Instant ranks",
              glow: "rgba(34,197,94,0.1)",
            },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.06 }}
              whileHover={{ y: -2, scale: 1.03 }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.12] group cursor-default"
            >
              <motion.div
                whileHover={{ rotate: 15, scale: 1.2 }}
                className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/[0.06] flex-shrink-0"
              >
                {f.icon}
              </motion.div>
              <span className="text-white/85 font-bold text-[11px] group-hover:text-white transition-colors">
                {f.title}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );

  // ============ SHARED COMPONENTS ============
  function renderCodeBoxes() {
    return (
      <div>
        <label className="text-xs font-bold text-[#6b6590] uppercase tracking-wider mb-3 block">
          Session Code
        </label>
        <div className="relative">
          <input
            type="text"
            maxLength={6}
            value={sessionCode}
            onChange={(e) =>
              setSessionCode(
                e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
              )
            }
            onFocus={() => setFocusedInput("code")}
            onBlur={() => setFocusedInput(null)}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData
                .getData("text")
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 6);
              if (pasted) setSessionCode(pasted);
            }}
            className="input-cartoon text-center text-2xl font-black tracking-[0.3em] opacity-0 absolute inset-0 z-10 cursor-text"
            style={{ caretColor: "transparent" }}
            placeholder="000000"
            disabled={isLoading}
          />
          <div className="flex gap-1.5 xs:gap-2 sm:gap-3 justify-center">
            {codeChars.map((char, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -1.5, scale: 1.02 }}
                className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl flex items-center justify-center text-lg sm:text-xl md:text-2xl font-black font-display transition-all duration-200 ${
                  focusedInput === "code" && sessionCode.length === idx
                    ? "border-2 border-cyan-300 bg-cyan-500/18"
                    : char.trim()
                      ? "border-2 border-violet-300/70 bg-violet-500/18"
                      : "border-2 border-white/25 bg-white/8"
                }`}
                style={{
                  boxShadow:
                    focusedInput === "code" && sessionCode.length === idx
                      ? "0 0 0 3px rgba(34,211,238,0.14), 0 0 22px rgba(34,211,238,0.22)"
                      : char.trim()
                        ? "0 6px 16px rgba(0,0,0,0.28)"
                        : "0 3px 10px rgba(0,0,0,0.2)",
                }}
                animate={
                  focusedInput === "code" && sessionCode.length === idx
                    ? { scale: [1, 1.05, 1] }
                    : {}
                }
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                {char.trim() && (
                  <motion.span
                    initial={{ scale: 0, rotateY: 90 }}
                    animate={{ scale: 1, rotateY: 0 }}
                    className="text-white"
                  >
                    {char}
                  </motion.span>
                )}
              </motion.div>
            ))}
          </div>

          <motion.div
            key={codeStatus}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2.5 text-center text-xs font-semibold"
          >
            {codeStatus === "invalid" && (
              <span className="text-rose-300">
                Invalid code. Check with your teacher and try again.
              </span>
            )}
            {codeStatus === "empty" && (
              <span className="text-white/55">Enter a 6-character code.</span>
            )}
            {codeStatus === "partial" && (
              <span className="text-amber-300">
                Code incomplete: {sessionCode.length}/6
              </span>
            )}
            {codeStatus === "valid" && !isLoading && (
              <span className="text-emerald-300">Code format looks valid.</span>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  function renderJoinButton() {
    return (
      <motion.button
        whileHover={sessionCode.length === 6 ? { scale: 1.01, y: -1 } : {}}
        whileTap={sessionCode.length === 6 ? { scale: 0.99 } : {}}
        type="submit"
        disabled={isLoading || sessionCode.length !== 6}
        className={`w-full h-12 text-sm font-extrabold rounded-xl text-white transition-all relative overflow-hidden ${
          sessionCode.length === 6
            ? "bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 border border-cyan-200/35 shadow-[0_12px_28px_rgba(59,130,246,0.34)]"
            : "bg-white/8 text-white/40 border border-white/12 cursor-not-allowed"
        }`}
      >
        {sessionCode.length === 6 && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            animate={{ x: [-140, 280] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}
        <span className="relative flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Joining Match...
            </>
          ) : (
            <>
              Join Live Quiz
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </span>
      </motion.button>
    );
  }
}
