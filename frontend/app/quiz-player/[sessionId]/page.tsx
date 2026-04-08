"use client";

/**
 * Quiz Player Page
 * Live quiz interface for students — immersive game UI with Kahoot-like flow
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import SpaceBackground from "@/components/SpaceBackground";
import { useAuthStore } from "@/lib/store/authStore";
import { useSessionStore } from "@/lib/store/sessionStore";
import { sessionAPI } from "@/lib/api";
import {
  initializeSocket,
  getSocket,
  disconnectSocket,
  waitForAuth,
  joinSession as socketJoinSession,
  onQuestionStarted,
  onQuestionEnded,
  onAnswerResult,
  onLeaderboardUpdate,
  onSessionJoined,
  onParticipantJoined,
  onQuizEnded,
  submitAnswer,
  offEvent,
} from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Trophy,
  Users,
  Sparkles,
  Zap,
  Flame,
  Clock,
  Shield,
  Star,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Image from "next/image";

const TIPS = [
  "Fast answers give bonus points! ⚡",
  "Read every option carefully 📖",
  "Stay calm, you've got this! 🧘",
  "Every second counts ⏱️",
  "Trust your first instinct! 💫",
  "Accuracy beats speed sometimes 🎯",
];

function CountUp({
  target,
  duration = 1500,
}: {
  target: number;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <>{count}</>;
}

export default function QuizPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const sessionParam = params?.sessionId as string;
  const { user, token, logout, _hasHydrated } = useAuthStore();

  const isGuest = user?.email?.includes("@guest.local") || !user?.email;
  const exitPath = isGuest ? "/" : "/student/dashboard";

  // Resolve session code to numeric ID
  const [sessionId, setSessionIdResolved] = useState("");

  const {
    sessionCode,
    setSession,
    currentQuestion,
    leaderboard,
    setLeaderboard,
    setCurrentQuestion,
    resetSession,
  } = useSessionStore();

  const [status, setStatus] = useState<
    "lobbyWaiting" | "startCountdown" | "question" | "leaderboard" | "ended"
  >("lobbyWaiting");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const hasSubmittedRef = useRef(false);
  const [answerFeedback, setAnswerFeedback] = useState<any>(null);
  const timerRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const [currentTip, setCurrentTip] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [themeImage, setThemeImage] = useState<string>("");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [startCountdown, setStartCountdown] = useState(5);
  const [streak, setStreak] = useState(0);
  const [responseTimeMs, setResponseTimeMs] = useState(0);
  const [pendingQuestion, setPendingQuestion] = useState<any>(null);
  const hasShownStartCountdownRef = useRef(false);
  const [notFound, setNotFound] = useState(false);
  // Server time offset: serverTime - clientTime (positive = server ahead)
  const serverOffsetRef = useRef(0);
  // Server timestamp of when the current question timer starts
  const questionStartTimeRef = useRef(0);
  // Current question duration in seconds
  const questionDurationRef = useRef(30);

  // Helper to create a URL-friendly slug from quiz title
  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "quiz";

  // Resolve session code (URL param) to numeric session ID
  useEffect(() => {
    if (!sessionParam) return;

    // If param is a 6-digit session code, resolve via API
    if (/^\d{6}$/.test(sessionParam)) {
      if (!token && !_hasHydrated) return;
      if (!token) return;
      sessionAPI
        .getSessionByCode(sessionParam)
        .then((res) => {
          const numericId = String(res.data?.session?.id);
          if (numericId && numericId !== "undefined") {
            setSessionIdResolved(numericId);
            // Replace URL with quiz title slug
            const title = res.data?.session?.quiz_title;
            if (title && typeof window !== "undefined") {
              const slug = slugify(title);
              sessionStorage.setItem(`qp_slug_${slug}`, sessionParam);
              window.history.replaceState(null, "", `/quiz-player/${slug}`);
            }
          } else {
            setNotFound(true);
          }
        })
        .catch(() => {
          setNotFound(true);
        });
    } else {
      // Try reverse lookup from sessionStorage (slug URL after refresh)
      if (typeof window !== "undefined") {
        const storedCode = sessionStorage.getItem(`qp_slug_${sessionParam}`);
        if (storedCode && /^\d{6}$/.test(storedCode)) {
          if (!token && !_hasHydrated) return;
          if (!token) return;
          sessionAPI
            .getSessionByCode(storedCode)
            .then((res) => {
              const numericId = String(res.data?.session?.id);
              if (numericId && numericId !== "undefined") {
                setSessionIdResolved(numericId);
              } else {
                setNotFound(true);
              }
            })
            .catch(() => {
              setNotFound(true);
            });
        } else {
          setNotFound(true);
        }
      } else {
        setNotFound(true);
      }
    }
  }, [sessionParam, token, _hasHydrated, router]);

  // Mouse tilt for waiting card
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -6, y: x * 6 });
  };
  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  // Rotate tips every 4 seconds
  useEffect(() => {
    if (status !== "lobbyWaiting") return;
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [status]);

  const beginQuestion = useCallback((data: any) => {
    setCurrentQuestion({
      id: data.questionId,
      question_text: data.questionText,
      time_limit: data.timeLimit,
      points: data.points,
      options: data.options,
    });
    questionStartTimeRef.current = data.questionStartTime;
    questionDurationRef.current = data.timeLimit || 30;
    setStatus("question");
    setSelectedOption(null);
    setHasSubmitted(false);
    hasSubmittedRef.current = false;
    setAnswerFeedback(null);
    setResponseTimeMs(0);
    startTimeRef.current = Date.now();
    setQuestionNumber((prev) => prev + 1);
    // timeRemaining will be computed by the single timer loop
  }, []);

  // Start countdown: compute remaining from server questionStartTime
  useEffect(() => {
    if (status !== "startCountdown") return;
    // The single timer loop handles the countdown computation.
    // When timeRemaining (countdown to questionStartTime) hits 0, transition to question.
  }, [status]);

  // Single timer loop — computes all countdowns from server timestamps
  useEffect(() => {
    if (
      status !== "startCountdown" &&
      status !== "question" &&
      status !== "leaderboard"
    )
      return;

    const tick = () => {
      const adjustedNow = Date.now() + serverOffsetRef.current;

      if (status === "startCountdown") {
        // Counting down to questionStartTime
        const remaining = Math.max(
          0,
          Math.ceil((questionStartTimeRef.current - adjustedNow) / 1000),
        );
        setStartCountdown(remaining);
        if (remaining <= 0 && pendingQuestion) {
          // Transition to question — timer starts from questionStartTime
          startTimeRef.current = Date.now();
          beginQuestion(pendingQuestion);
          setPendingQuestion(null);
        }
      } else if (status === "question") {
        // Counting down the question timer
        const deadline =
          questionStartTimeRef.current + questionDurationRef.current * 1000;
        const remaining = Math.max(
          0,
          Math.ceil((deadline - adjustedNow) / 1000),
        );
        setTimeRemaining(remaining);
      } else if (status === "leaderboard") {
        // If a next question has been scheduled (questionStartTime set for future),
        // count down to it. The QuestionStarted handler will trigger beginQuestion.
        if (questionStartTimeRef.current > adjustedNow) {
          const remaining = Math.max(
            0,
            Math.ceil((questionStartTimeRef.current - adjustedNow) / 1000),
          );
          setTimeRemaining(remaining);
        } else {
          setTimeRemaining(0);
        }
      }
    };

    tick(); // immediate first tick
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [status, pendingQuestion, beginQuestion]);

  // Immediate API fetch for session data — independent of socket auth
  const sessionCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token && !_hasHydrated) return;
    if (!token || !sessionId) return;
    let cancelled = false;

    sessionAPI
      .getSession(sessionId)
      .then((res) => {
        if (cancelled) return;
        const sess = res.data.session;
        const participants = res.data.participants;
        if (sess?.session_code) {
          sessionCodeRef.current = sess.session_code;
          setSession(sessionId, sess.session_code, 0);
          setPlayerCount(participants?.length || 0);
          const theme = sess.quiz_theme;
          if (theme && theme !== "none") {
            setThemeImage(`/themes/${theme}.png`);
          }
          // If session is already completed, jump straight to ended state
          if (sess.status === "Completed") {
            setStatus("ended");
            // Load final leaderboard
            sessionAPI
              .getLeaderboard(sessionId)
              .then((lbRes) => {
                if (!cancelled && lbRes.data) {
                  setLeaderboard(
                    (Array.isArray(lbRes.data) ? lbRes.data : []).map(
                      (entry: any) => ({
                        rank: entry.rank,
                        nickname: entry.nickname,
                        score: entry.total_score ?? entry.score ?? 0,
                        totalResponseTime:
                          Number(
                            entry.total_response_time ??
                              entry.totalResponseTime,
                          ) || 0,
                      }),
                    ),
                  );
                }
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [_hasHydrated, token, sessionId]);

  // Poll for participant count every 5 seconds (safety net)
  useEffect(() => {
    if (!token && !_hasHydrated) return;
    if (!token || !sessionId || status !== "lobbyWaiting") return;
    const interval = setInterval(() => {
      sessionAPI
        .getSession(sessionId)
        .then((res) => {
          const participants = res.data?.participants;
          if (participants) {
            setPlayerCount((prev) =>
              participants.length !== prev ? participants.length : prev,
            );
          }
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [_hasHydrated, token, sessionId, status]);

  // Socket connection for real-time events
  useEffect(() => {
    if (!token && !_hasHydrated) return;
    if (!token) {
      router.replace("/login");
      return;
    }

    const socket = initializeSocket(token);
    let initialJoinDone = false;

    const joinRoom = (code: string) => {
      socketJoinSession(code, user?.name || "Player");
    };

    const doJoinAfterAuth = () => {
      if (sessionCodeRef.current) {
        joinRoom(sessionCodeRef.current);
        initialJoinDone = true;
        return;
      }
      sessionAPI
        .getSession(sessionId)
        .then((res) => {
          const sess = res.data.session;
          const participants = res.data.participants;
          if (sess?.session_code) {
            sessionCodeRef.current = sess.session_code;
            setSession(sessionId, sess.session_code, 0);
            setPlayerCount(participants?.length || 0);
            joinRoom(sess.session_code);
            initialJoinDone = true;
          }
        })
        .catch(() => {});
    };

    waitForAuth()
      .then(() => doJoinAfterAuth())
      .catch(() => {});

    const onReAuthenticated = () => {
      if (!initialJoinDone || !sessionCodeRef.current) return;
      joinRoom(sessionCodeRef.current);
    };
    socket.on("authenticated", onReAuthenticated);

    // Capture server time offset on connect
    socket.on("ServerTime", (data: any) => {
      if (data?.serverTime) {
        serverOffsetRef.current = data.serverTime - Date.now();
      }
    });

    onSessionJoined(() => {
      setStatus("lobbyWaiting");
      hasShownStartCountdownRef.current = false;
    });

    onParticipantJoined(() => {
      setPlayerCount((prev) => prev + 1);
    });

    onQuestionStarted((data) => {
      // Store server-synced start time
      questionStartTimeRef.current = data.questionStartTime;
      questionDurationRef.current = data.timeLimit || 30;

      if (!hasShownStartCountdownRef.current) {
        // First question: show startup countdown to questionStartTime
        setPendingQuestion(data);
        const adjustedNow = Date.now() + serverOffsetRef.current;
        const remaining = Math.max(
          0,
          Math.ceil((data.questionStartTime - adjustedNow) / 1000),
        );
        setStartCountdown(remaining);
        setStatus("startCountdown");
        hasShownStartCountdownRef.current = true;
        return;
      }

      // Subsequent questions: switch to question immediately
      beginQuestion(data);
    });

    onQuestionEnded(() => {
      // Instantly switch to leaderboard — no reveal countdown
      clearInterval(timerRef.current);
      setTimeRemaining(0);
      setStatus("leaderboard");
    });

    onAnswerResult((data) => {
      setAnswerFeedback(data);
      setStreak((prev) => (data.isCorrect ? prev + 1 : 0));
      if (data.pointsAwarded) {
        setTotalScore((prev) => prev + data.pointsAwarded);
      }
      // Answer feedback stays inline on question cards — no status transition
    });

    onLeaderboardUpdate((data) => {
      setLeaderboard(data.leaderboard);
    });

    onQuizEnded((data) => {
      if (data.finalLeaderboard && Array.isArray(data.finalLeaderboard)) {
        setLeaderboard(
          data.finalLeaderboard.map((entry: any) => ({
            rank: entry.rank,
            nickname: entry.nickname,
            score: entry.total_score ?? entry.score ?? 0,
            totalResponseTime:
              Number(entry.total_response_time ?? entry.totalResponseTime) || 0,
          })),
        );
      }
      setStatus("ended");
    });

    return () => {
      clearInterval(timerRef.current);
      socket.off("authenticated", onReAuthenticated);
      socket.off("ServerTime");
      offEvent("SessionJoined");
      offEvent("ParticipantJoined");
      offEvent("QuestionStarted");
      offEvent("QuestionEnded");
      offEvent("AnswerResult");
      offEvent("LeaderboardUpdate");
      offEvent("QuizEnded");
    };
  }, [token, sessionId, _hasHydrated]);

  // Disconnect socket only on true component unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  const handleSelectOption = (optionId: number) => {
    if (!hasSubmitted && currentQuestion && timeRemaining > 0) {
      setSelectedOption(optionId);
      setHasSubmitted(true);
      hasSubmittedRef.current = true;
      const responseTime = Date.now() - startTimeRef.current;
      setResponseTimeMs(responseTime);
      submitAnswer(currentQuestion.id, optionId, responseTime);
    }
  };

  const OPTION_STYLES = [
    {
      bg: "from-[#10b981] to-[#059669]",
      bgTint: "bg-emerald-100/8",
      border: "border-emerald-100/70",
      activeBg: "from-[#34d399] to-[#10b981]",
      glow: "rgba(16,185,129,0.5)",
      glowStrong: "rgba(16,185,129,0.8)",
      letter: "A",
    },
    {
      bg: "from-[#ec4899] to-[#be185d]",
      bgTint: "bg-pink-100/8",
      border: "border-pink-100/70",
      activeBg: "from-[#f472b6] to-[#db2777]",
      glow: "rgba(236,72,153,0.5)",
      glowStrong: "rgba(236,72,153,0.8)",
      letter: "B",
    },
    {
      bg: "from-[#f59e0b] to-[#d97706]",
      bgTint: "bg-amber-100/10",
      border: "border-amber-100/72",
      activeBg: "from-[#fbbf24] to-[#ea580c]",
      glow: "rgba(245,158,11,0.5)",
      glowStrong: "rgba(245,158,11,0.8)",
      letter: "C",
    },
    {
      bg: "from-[#06b6d4] to-[#0284c7]",
      bgTint: "bg-cyan-100/8",
      border: "border-cyan-100/70",
      activeBg: "from-[#22d3ee] to-[#06b6d4]",
      glow: "rgba(6,182,212,0.5)",
      glowStrong: "rgba(6,182,212,0.8)",
      letter: "D",
    },
    {
      bg: "from-[#8b5cf6] to-[#6d28d9]",
      bgTint: "bg-violet-100/8",
      border: "border-violet-100/70",
      activeBg: "from-[#a78bfa] to-[#7c3aed]",
      glow: "rgba(139,92,246,0.5)",
      glowStrong: "rgba(139,92,246,0.8)",
      letter: "E",
    },
    {
      bg: "from-[#d946ef] to-[#a21caf]",
      bgTint: "bg-fuchsia-100/8",
      border: "border-fuchsia-100/70",
      activeBg: "from-[#e879f9] to-[#c026d3]",
      glow: "rgba(217,70,239,0.5)",
      glowStrong: "rgba(217,70,239,0.8)",
      letter: "F",
    },
    {
      bg: "from-[#14b8a6] to-[#0d9488]",
      bgTint: "bg-teal-100/8",
      border: "border-teal-100/70",
      activeBg: "from-[#2dd4bf] to-[#14b8a6]",
      glow: "rgba(20,184,166,0.5)",
      glowStrong: "rgba(20,184,166,0.8)",
      letter: "G",
    },
    {
      bg: "from-[#f43f5e] to-[#be123c]",
      bgTint: "bg-rose-100/8",
      border: "border-rose-100/70",
      activeBg: "from-[#fb7185] to-[#e11d48]",
      glow: "rgba(244,63,94,0.5)",
      glowStrong: "rgba(244,63,94,0.8)",
      letter: "H",
    },
  ];

  const questionDuration = currentQuestion?.time_limit || 30;
  const timerProgress = Math.max(
    0,
    Math.min(100, (timeRemaining / questionDuration) * 100),
  );
  const timerRingRadius = 56;
  const timerRingCircumference = 2 * Math.PI * timerRingRadius;
  const timerRingOffset =
    timerRingCircumference - (timerProgress / 100) * timerRingCircumference;

  // Dynamic timer color: green → yellow → red
  const timerColor = useMemo(() => {
    if (timerProgress > 60)
      return {
        stroke: "#22c55e",
        text: "text-emerald-200",
        glow: "rgba(34,197,94,0.7)",
        bg: "border-emerald-400/60",
      };
    if (timerProgress > 30)
      return {
        stroke: "#eab308",
        text: "text-yellow-200",
        glow: "rgba(234,179,8,0.7)",
        bg: "border-yellow-400/60",
      };
    return {
      stroke: "#ef4444",
      text: "text-red-200",
      glow: "rgba(239,68,68,0.9)",
      bg: "border-red-400/60",
    };
  }, [timerProgress]);

  // Theme background for inside cards (same approach as quiz builder)

  if (notFound) {
    return (
      <div className="space-bg min-h-screen flex items-center justify-center p-4">
        <div className="cartoon-panel max-w-md w-full p-8 text-center">
          <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 mb-2">
            404
          </div>
          <h2 className="text-xl font-black text-white mb-2">
            Session Not Found
          </h2>
          <p className="text-purple-300 text-sm mb-6">
            This session doesn&apos;t exist, has ended, or the code is invalid.
          </p>
          <button
            onClick={() => router.replace("/join-quiz")}
            className="btn-cartoon btn-cartoon-pink px-6 py-2 text-sm"
          >
            Join a Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden flex flex-col font-sans">
      <div className="fixed inset-0 z-0 bg-deep">
        <SpaceBackground />
        {themeImage && (
          <Image
            src={themeImage}
            alt=""
            fill
            sizes="100vw"
            priority
            className="absolute inset-0 object-cover opacity-80 z-0"
            onError={() => setThemeImage("")}
          />
        )}
        <div
          className={`absolute inset-0 z-10 ${status === "question" || status === "startCountdown" ? "bg-slate-950/78" : status === "leaderboard" ? "bg-slate-950/80 backdrop-blur-sm" : status === "ended" ? "bg-slate-950/70" : "bg-slate-900/58"}`}
        />
        {status === "startCountdown" && (
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/55 via-black/35 to-black/60" />
        )}
        {status === "question" && (
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/58 via-black/38 to-black/62" />
        )}
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        {status !== "question" && status !== "leaderboard" && (
          <div className="px-3 pt-3">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto flex justify-between items-center gap-3 glass-card py-2.5 px-4"
              style={{ borderRadius: "1rem" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base md:text-lg font-bold font-display gradient-text-pink-cyan truncate">
                    Quiz Arena
                  </h1>
                  <p className="text-purple-200/50 text-[10px] truncate">
                    {user?.name} • {sessionCode || "..."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div
                  className="glass-card px-3 py-1.5 hidden sm:flex items-center gap-1.5 text-xs"
                  style={{ borderRadius: "0.5rem" }}
                >
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold text-white">{totalScore}</span>
                </div>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (isGuest) {
                      logout();
                    } else {
                      disconnectSocket();
                      resetSession();
                    }
                    router.replace(exitPath);
                  }}
                  className="btn-cartoon btn-cartoon-outline px-3 py-1.5 text-xs rounded-xl inline-flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Exit
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}

        <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-3 flex flex-col">
          {/* ═══ Lobby Waiting ═══ */}
          {status === "lobbyWaiting" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex items-center justify-center"
            >
              <div className="w-full max-w-lg text-center perspective-container relative">
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <motion.span
                      key={idx}
                      className="absolute w-1.5 h-1.5 rounded-full bg-fuchsia-300/50"
                      style={{
                        left: `${8 + ((idx * 7.5) % 84)}%`,
                        top: `${12 + ((idx * 9) % 76)}%`,
                      }}
                      animate={{ y: [0, -18, 0], opacity: [0.2, 0.8, 0.2] }}
                      transition={{
                        duration: 2.2 + (idx % 4) * 0.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: idx * 0.08,
                      }}
                    />
                  ))}
                </div>
                <motion.div
                  ref={cardRef}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="glow-border depth-shadow p-8 md:p-10 relative rounded-3xl border border-fuchsia-400/45 bg-slate-950/70"
                  style={{
                    transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                    transition: "transform 0.15s ease-out",
                    boxShadow:
                      "0 22px 70px rgba(2,6,23,0.72), inset 0 1px 0 rgba(255,255,255,0.1)",
                  }}
                >
                  {/* Top glow */}
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60 rounded-t-3xl" />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent rounded-3xl pointer-events-none" />

                  {/* Pulse rings */}
                  <div className="relative w-28 h-28 mx-auto mb-5">
                    <div className="pulse-ring absolute inset-0 w-full h-full" />
                    <div
                      className="pulse-ring absolute inset-0 w-full h-full"
                      style={{ animationDelay: "0.5s" }}
                    />
                    <div
                      className="pulse-ring absolute inset-0 w-full h-full"
                      style={{ animationDelay: "1s" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        animate={{
                          scale: [1, 1.08, 1],
                          rotate: [0, 6, 0, -6, 0],
                        }}
                        transition={{ duration: 1.3, repeat: Infinity }}
                        className="w-20 h-20 rounded-full flex items-center justify-center"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(34,211,238,0.3), rgba(139,92,246,0.5))",
                          boxShadow:
                            "0 0 30px rgba(34,211,238,0.25), inset 0 0 20px rgba(255,255,255,0.08)",
                        }}
                      >
                        <Clock className="w-10 h-10 text-white drop-shadow-lg" />
                      </motion.div>
                    </div>
                  </div>

                  <h2 className="text-3xl md:text-4xl font-bold font-display text-white mb-2 neon-text relative z-10">
                    Waiting For Host
                  </h2>
                  <p className="text-cyan-100/85 mb-5 text-sm md:text-base relative z-10 font-semibold tracking-wide">
                    Your teacher will start the match soon. Stay sharp and get
                    ready.
                  </p>

                  <div className="mb-4 relative z-10 rounded-2xl px-4 py-3 border border-cyan-300/30 bg-cyan-950/35">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wider font-bold text-cyan-100/85">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-200/35 bg-cyan-400/10">
                        <Users className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Players Joined: {playerCount}</span>
                      </div>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200/30 bg-emerald-400/10 text-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                        <span>Waiting for host</span>
                      </div>
                    </div>
                  </div>

                  {/* Tips carousel */}
                  <div
                    className="rounded-2xl p-4 mb-5 mx-auto min-h-[52px] flex items-center justify-center relative z-10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(34,211,238,0.16))",
                      border: "1px solid rgba(139,92,246,0.35)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 22px rgba(0,0,0,0.28)",
                    }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentTip}
                        initial={{ opacity: 0, y: 12, rotateX: -15 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        exit={{ opacity: 0, y: -12, rotateX: 15 }}
                        transition={{ duration: 0.35 }}
                        className="flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                        <span className="text-purple-100 font-medium text-sm">
                          {TIPS[currentTip]}
                        </span>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="relative z-10 mt-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-fuchsia-100/80">
                    Session opens instantly when your teacher presses Start
                    Quiz.
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {status === "startCountdown" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex items-center justify-center"
            >
              <div className="w-full max-w-lg text-center perspective-container relative">
                <motion.div
                  className="glow-border depth-shadow p-8 md:p-10 relative rounded-3xl border-2 border-cyan-300/60 bg-slate-950/90"
                  animate={{ scale: 1 + (5 - startCountdown) * 0.012 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  style={{
                    boxShadow:
                      "0 26px 80px rgba(2,6,23,0.86), inset 0 1px 0 rgba(255,255,255,0.16)",
                  }}
                >
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70 rounded-t-3xl" />
                  <div className="absolute inset-0 bg-gradient-to-b from-cyan-200/[0.09] to-black/30 rounded-3xl pointer-events-none" />

                  <div className="relative w-28 h-28 mx-auto mb-5">
                    <div className="pulse-ring absolute inset-0 w-full h-full" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        animate={{
                          scale: [1, 1.08, 1],
                          rotate: [0, 5, 0, -5, 0],
                        }}
                        transition={{ duration: 1.1, repeat: Infinity }}
                        className="w-20 h-20 rounded-full flex items-center justify-center"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(34,211,238,0.34), rgba(59,130,246,0.44))",
                          boxShadow:
                            "0 0 30px rgba(34,211,238,0.28), inset 0 0 20px rgba(255,255,255,0.08)",
                        }}
                      >
                        <Clock className="w-10 h-10 text-white drop-shadow-lg" />
                      </motion.div>
                    </div>
                  </div>

                  <h2 className="text-4xl md:text-5xl font-black font-display text-white mb-2 neon-text relative z-10 drop-shadow-[0_6px_28px_rgba(0,0,0,0.9)]">
                    Match Starts In {startCountdown}
                  </h2>
                  <p className="text-cyan-50 mb-5 text-base md:text-lg relative z-10 font-bold tracking-wide drop-shadow-[0_4px_14px_rgba(0,0,0,0.92)]">
                    Get ready. First question is about to launch.
                  </p>

                  <div className="relative z-10 mt-3">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.16em] text-cyan-50 mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                      <span>Launch Progress</span>
                      <span>{5 - startCountdown}/5</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-black/55 overflow-hidden border border-cyan-100/30 shadow-[inset_0_0_10px_rgba(0,0,0,0.6)]">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 shadow-[0_0_14px_rgba(56,189,248,0.75)]"
                        animate={{
                          width: `${((5 - startCountdown) / 5) * 100}%`,
                        }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ═══ Question ═══ */}
          {status === "question" && currentQuestion && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative flex-1 flex flex-col justify-evenly max-w-6xl mx-auto w-full py-2 px-1 z-10"
            >
              <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                <motion.div
                  className="absolute top-[16%] left-[7%] w-2.5 h-2.5 rounded-full bg-cyan-300/70"
                  animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: 2.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="absolute top-[28%] right-[10%] w-3 h-3 rounded-full bg-pink-300/65"
                  animate={{ y: [0, -12, 0], opacity: [0.4, 0.9, 0.4] }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.4,
                  }}
                />
                <motion.div
                  className="absolute bottom-[20%] left-[14%] w-2 h-2 rounded-full bg-emerald-300/70"
                  animate={{ y: [0, -8, 0], opacity: [0.45, 0.95, 0.45] }}
                  transition={{
                    duration: 2.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.7,
                  }}
                />
                <motion.div
                  className="absolute bottom-[14%] right-[15%] w-2.5 h-2.5 rounded-full bg-amber-300/70"
                  animate={{ y: [0, -9, 0], opacity: [0.4, 0.9, 0.4] }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.25,
                  }}
                />
              </div>

              {/* Top: Player info + question meta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 px-1">
                <div className="rounded-2xl border border-cyan-100/35 bg-gradient-to-br from-slate-900/92 via-slate-800/88 to-indigo-950/84 backdrop-blur-xl px-4 py-3 flex items-center gap-3 shadow-[0_14px_36px_rgba(0,0,0,0.56)]">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-black flex items-center justify-center border border-white/40 shadow-[0_0_14px_rgba(59,130,246,0.55)]">
                    {(user?.name || "P").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-cyan-50 font-black text-sm truncate">
                      {user?.name || "Player"}
                    </p>
                    <p className="text-cyan-100/85 text-xs font-semibold uppercase tracking-wide">
                      Ready to answer
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 text-amber-200 rounded-xl border border-amber-300/40 bg-amber-500/20 px-3 py-1.5">
                    <Star className="w-4 h-4" />
                    <span className="font-black text-sm">{totalScore}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-cyan-100/35 bg-gradient-to-br from-slate-900/92 via-slate-800/88 to-indigo-950/84 backdrop-blur-xl px-4 py-3 flex items-center justify-between shadow-[0_14px_36px_rgba(0,0,0,0.56)]">
                  <span className="text-white/85 font-black uppercase tracking-wider text-sm">
                    Question {questionNumber}
                  </span>
                  <div className="flex items-center gap-2">
                    {streak >= 1 && (
                      <div className="flex items-center gap-1 rounded-xl border border-orange-300/45 bg-orange-500/20 px-2.5 py-1.5 text-orange-100 shadow-[0_0_12px_rgba(251,146,60,0.45)]">
                        <Flame className="w-4 h-4 text-orange-300" />
                        <span className="font-black text-xs">
                          Streak x{streak}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 bg-amber-500/25 px-3 py-1.5 rounded-xl border border-amber-300/45 shadow-[0_0_14px_rgba(245,158,11,0.35)]">
                      <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                      <span className="font-black text-amber-200 text-sm">
                        {currentQuestion.points} pts
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center: Circular timer with green→yellow→red */}
              <div className="flex justify-center">
                <motion.div
                  className={`relative z-20 w-24 h-24 md:w-28 md:h-28 rounded-full border-2 ${timerColor.bg} bg-gradient-to-br from-slate-900/93 via-slate-800/88 to-indigo-950/84 backdrop-blur-xl flex items-center justify-center shadow-[0_18px_42px_rgba(0,0,0,0.62)]`}
                  animate={
                    timeRemaining <= 5
                      ? { scale: [1, 1.1, 1], x: [0, -4, 4, -4, 4, 0] }
                      : timeRemaining <= 10
                        ? { scale: [1, 1.04, 1] }
                        : { scale: 1 }
                  }
                  transition={{
                    duration: timeRemaining <= 5 ? 0.5 : 0.8,
                    repeat: Infinity,
                  }}
                >
                  {/* Urgency pulse ring */}
                  {timeRemaining <= 5 && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-[3px] border-red-400/80"
                      animate={{ scale: [1, 1.25], opacity: [0.9, 0] }}
                      transition={{
                        duration: 0.7,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                    />
                  )}
                  {timeRemaining <= 10 && timeRemaining > 5 && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-yellow-400/50"
                      animate={{ scale: [1, 1.15], opacity: [0.6, 0] }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                    />
                  )}
                  <svg
                    className="absolute inset-0 w-full h-full -rotate-90"
                    viewBox="0 0 140 140"
                  >
                    <circle
                      cx="70"
                      cy="70"
                      r={timerRingRadius}
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="10"
                    />
                    <motion.circle
                      cx="70"
                      cy="70"
                      r={timerRingRadius}
                      fill="none"
                      stroke={timerColor.stroke}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={timerRingCircumference}
                      animate={{ strokeDashoffset: timerRingOffset }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      style={{
                        filter: `drop-shadow(0 0 12px ${timerColor.glow})`,
                      }}
                    />
                  </svg>
                  <div className="relative z-10 text-center">
                    <motion.div
                      key={timeRemaining}
                      initial={{ scale: 1.3, opacity: 0.7 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className={`font-mono text-3xl md:text-4xl font-black leading-none ${timerColor.text}`}
                    >
                      {timeRemaining}
                    </motion.div>
                    <div className="text-[11px] uppercase tracking-widest text-white/70 font-bold mt-1">
                      seconds
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Center: Hero question card */}
              <div className="flex items-center justify-center px-3 md:px-6">
                <motion.div
                  key={`q-${questionNumber}`}
                  initial={{ opacity: 0, y: 35, scale: 0.92, rotateX: -8 }}
                  animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 22,
                    delay: 0.1,
                  }}
                  className="relative z-30 w-full max-w-3xl"
                >
                  <div className="relative w-full rounded-[2.2rem] border border-cyan-100/45 bg-gradient-to-br from-slate-900/95 via-slate-800/92 to-indigo-950/90 backdrop-blur-2xl px-4 py-3 md:px-6 md:py-4 shadow-[0_34px_72px_rgba(0,0,0,0.7)]">
                    <div className="pointer-events-none absolute -inset-[2px] rounded-[2.35rem] border border-cyan-300/30" />
                    <div className="pointer-events-none absolute inset-0 rounded-[2.2rem] bg-gradient-to-br from-cyan-400/12 via-transparent to-pink-400/12" />
                    <div className="pointer-events-none absolute left-4 right-4 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
                    <div className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 w-1.5 h-12 rounded-full bg-cyan-300/55" />
                    <div className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 w-1.5 h-12 rounded-full bg-pink-300/55" />
                    <motion.div
                      className="absolute -top-3 -left-3 text-cyan-200/80"
                      animate={{ rotate: [0, 15, 0], scale: [1, 1.1, 1] }}
                      transition={{
                        duration: 2.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <Sparkles className="w-5 h-5" />
                    </motion.div>
                    <motion.div
                      className="absolute -bottom-3 -right-3 text-pink-200/80"
                      animate={{ rotate: [0, -15, 0], scale: [1, 1.12, 1] }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.3,
                      }}
                    >
                      <Star className="w-5 h-5" />
                    </motion.div>
                    <p className="relative z-10 text-center text-cyan-100/90 text-xs md:text-sm font-black uppercase tracking-[0.2em] mb-1">
                      Answer Fast For Bonus
                    </p>
                    <h2 className="relative z-10 text-2xl md:text-3xl lg:text-4xl font-black text-white text-center drop-shadow-[0_10px_34px_rgba(0,0,0,0.95)] leading-[1.08] font-display tracking-tight px-3">
                      {currentQuestion.question_text}
                    </h2>
                  </div>
                </motion.div>
              </div>

              {/* Bottom: 2x2 answer cards with staggered entrance */}
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3 px-2 md:px-4 auto-rows-auto [perspective:1200px]">
                {currentQuestion.options.map((option: any, idx: number) => {
                  const style = OPTION_STYLES[idx % OPTION_STYLES.length];
                  const isSelected = selectedOption === option.id;
                  const isWrongAnswer =
                    answerFeedback && !answerFeedback.isCorrect && isSelected;
                  const isCorrectAnswer =
                    answerFeedback &&
                    answerFeedback.isCorrect &&
                    option.id === answerFeedback.optionId;

                  return (
                    <motion.button
                      type="button"
                      key={option.id}
                      initial={{
                        opacity: 0,
                        y: 40,
                        scale: 0.85,
                        rotateX: -15,
                      }}
                      whileHover={
                        !hasSubmitted
                          ? {
                              scale: 1.06,
                              y: -6,
                              rotateX: 4,
                              rotateY: idx % 2 === 0 ? -4 : 4,
                            }
                          : {}
                      }
                      whileTap={
                        !hasSubmitted
                          ? { scale: 0.94, y: 2, rotateX: 0, rotateY: 0 }
                          : {}
                      }
                      onClick={() => handleSelectOption(option.id)}
                      disabled={hasSubmitted}
                      animate={
                        isWrongAnswer
                          ? {
                              opacity: 0.7,
                              y: 0,
                              scale: 0.97,
                              x: [0, -8, 8, -6, 6, 0],
                              rotateX: 0,
                            }
                          : isCorrectAnswer
                            ? { opacity: 1, y: 0, scale: 1.04, rotateX: 0 }
                            : hasSubmitted && !isSelected
                              ? {
                                  opacity: 0.4,
                                  y: 0,
                                  scale: 0.95,
                                  rotateX: 0,
                                }
                              : { opacity: 1, y: 0, scale: 1, rotateX: 0 }
                      }
                      transition={{
                        ...(isWrongAnswer
                          ? { duration: 0.5, ease: "easeInOut" }
                          : {
                              type: "spring",
                              stiffness: 320,
                              damping: 22,
                              delay: idx * 0.12,
                            }),
                      }}
                      className={`relative min-h-[48px] md:min-h-[56px] p-2.5 md:p-3 rounded-[1.3rem] md:rounded-[1.5rem] border-[2px] font-black text-left transition-all duration-300 ease-out text-white text-lg md:text-2xl shadow-xl cursor-pointer bg-gradient-to-br ${
                        isCorrectAnswer
                          ? "scale-[1.03] from-emerald-500/78 to-emerald-400/62 border-emerald-100/95 shadow-[0_0_42px_rgba(16,185,129,0.95)]"
                          : isWrongAnswer
                            ? "from-red-600/75 to-red-700/65 border-red-200/95 shadow-[0_0_34px_rgba(239,68,68,0.9)] opacity-75"
                            : isSelected && hasSubmitted
                              ? style.activeBg +
                                " " +
                                style.border +
                                " ring-[3px] ring-white/40 ring-offset-1 ring-offset-transparent"
                              : isSelected && !hasSubmitted
                                ? style.activeBg +
                                  " " +
                                  style.border +
                                  " ring-[3px] ring-white/50 ring-offset-2 ring-offset-transparent"
                                : style.bg + " " + style.border
                      } ${hasSubmitted && !isSelected && !isCorrectAnswer ? "opacity-45 grayscale saturate-50 scale-95" : ""} ${hasSubmitted ? "cursor-not-allowed" : "hover:shadow-[0_18px_36px_rgba(0,0,0,0.5)]"}`}
                      style={{
                        boxShadow:
                          isSelected && !hasSubmitted
                            ? `0 0 50px ${style.glowStrong}, 0 0 24px ${style.glow}, inset 0 0 30px rgba(255,255,255,0.25)`
                            : isSelected &&
                                hasSubmitted &&
                                !isCorrectAnswer &&
                                !isWrongAnswer
                              ? `0 0 36px ${style.glow}, inset 0 0 20px rgba(255,255,255,0.15)`
                              : isCorrectAnswer
                                ? "0 0 50px rgba(16,185,129,0.85), inset 0 0 30px rgba(255,255,255,0.2)"
                                : isWrongAnswer
                                  ? "0 0 40px rgba(239,68,68,0.75), inset 0 0 20px rgba(0,0,0,0.3)"
                                  : "0 12px 32px rgba(0,0,0,0.6)",
                        transformStyle: "preserve-3d",
                        transformPerspective: 1200,
                      }}
                    >
                      {/* Pulsing hover-ready border */}
                      {!hasSubmitted && !isSelected && (
                        <motion.div
                          className="pointer-events-none absolute inset-0 rounded-[1.6rem] md:rounded-[1.8rem] border-2 border-white/30"
                          animate={{ opacity: [0.3, 0.7, 0.3] }}
                          transition={{
                            duration: 1.6,
                            repeat: Infinity,
                            delay: idx * 0.2,
                          }}
                        />
                      )}

                      {/* Selection ripple pulse */}
                      {isSelected && !hasSubmitted && (
                        <motion.div
                          className="pointer-events-none absolute inset-0 rounded-[1.6rem] md:rounded-[1.8rem] border-[3px] border-white/60"
                          initial={{ scale: 0.92, opacity: 0 }}
                          animate={{
                            scale: [0.92, 1.06, 1],
                            opacity: [0, 0.9, 0.4],
                          }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      )}
                      {isSelected && !hasSubmitted && (
                        <motion.div
                          className="pointer-events-none absolute inset-0 rounded-[1.6rem] md:rounded-[1.8rem]"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0.5, 0] }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          style={{
                            background: `radial-gradient(circle at center, ${style.glow}, transparent 70%)`,
                          }}
                        />
                      )}

                      {/* Correct answer glow burst */}
                      {isCorrectAnswer && (
                        <motion.div
                          className="pointer-events-none absolute inset-0 rounded-[1.6rem] md:rounded-[1.8rem]"
                          initial={{ opacity: 0 }}
                          animate={{
                            opacity: [0, 0.6, 0.3],
                            scale: [1, 1.08, 1.02],
                          }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          style={{
                            background:
                              "radial-gradient(circle, rgba(16,185,129,0.35), transparent 70%)",
                          }}
                        />
                      )}

                      <div className="pointer-events-none absolute inset-0 rounded-[1.6rem] md:rounded-[1.8rem] bg-[linear-gradient(130deg,rgba(255,255,255,0.16),transparent_38%,rgba(0,0,0,0.12))]" />
                      <div
                        className={`pointer-events-none absolute inset-0 rounded-[1.6rem] md:rounded-[1.8rem] ${style.bgTint} opacity-55`}
                      />
                      <div className="flex items-center gap-3 relative z-10 w-full h-full">
                        <motion.span
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg md:text-xl bg-black/28 border-2 border-white/60 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] shrink-0 shadow-inner"
                          animate={
                            isCorrectAnswer
                              ? {
                                  scale: [1, 1.25, 1],
                                  rotate: [0, 10, -10, 0],
                                }
                              : isWrongAnswer
                                ? { scale: [1, 0.9, 1] }
                                : {}
                          }
                          transition={{ duration: 0.5 }}
                        >
                          {style.letter}
                        </motion.span>
                        <span className="leading-snug drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] flex-1 text-lg md:text-[1.6rem] font-black">
                          {option.text}
                        </span>
                        {isCorrectAnswer ? (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: [0, 1.3, 1], rotate: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 12,
                            }}
                            className="text-emerald-100"
                          >
                            <CheckCircle className="w-7 h-7 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                          </motion.div>
                        ) : isWrongAnswer ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 14,
                            }}
                            className="text-red-200"
                          >
                            <XCircle className="w-6 h-6 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
                          </motion.div>
                        ) : !hasSubmitted ? (
                          <motion.div
                            animate={{
                              scale: [1, 1.12, 1],
                              rotate: [0, 8, 0],
                            }}
                            transition={{
                              duration: 1.2,
                              repeat: Infinity,
                              delay: idx * 0.12,
                            }}
                            className="text-white/80"
                          >
                            <Zap className="w-5 h-5" />
                          </motion.div>
                        ) : null}
                      </div>

                      {/* Selection overlay */}
                      {isSelected && hasSubmitted && answerFeedback && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`pointer-events-none absolute inset-[-2px] rounded-[1.4rem] md:rounded-[1.6rem] z-0 border-[3px] ${isCorrectAnswer ? "border-emerald-300/80" : isWrongAnswer ? "border-red-300/80" : "border-white/40"}`}
                        />
                      )}

                      {/* Answer locked / wrong badge */}
                      <AnimatePresence>
                        {isSelected && hasSubmitted && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.7 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8, y: -10 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 20,
                            }}
                            className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-black tracking-widest uppercase border-2 text-white z-20 flex items-center gap-1.5 whitespace-nowrap ${
                              isCorrectAnswer
                                ? "shadow-[0_0_24px_rgba(16,185,129,0.8)] bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-300"
                                : isWrongAnswer
                                  ? "shadow-[0_0_20px_rgba(239,68,68,0.7)] bg-gradient-to-r from-red-600 to-red-700 border-red-400"
                                  : "shadow-[0_0_20px_rgba(139,92,246,0.6)] bg-gradient-to-r from-purple-600 to-indigo-600 border-white/40"
                            }`}
                          >
                            {isCorrectAnswer ? (
                              <>
                                <CheckCircle className="w-4 h-4" /> Correct!
                              </>
                            ) : isWrongAnswer ? (
                              <>
                                <XCircle className="w-4 h-4" /> Wrong
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" /> Locked
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* "Waiting for others" after submit */}
                      {hasSubmitted && isSelected && !answerFeedback && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/60 font-semibold tracking-wide z-20"
                        >
                          Waiting for results...
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* ─── Floating feedback popup for correct answers ─── */}
              <AnimatePresence>
                {answerFeedback && answerFeedback.isCorrect && (
                  <motion.div
                    key="correct-popup"
                    initial={{ opacity: 0, y: 30, scale: 0.7 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 350, damping: 20 }}
                    className="relative z-30 mx-auto mt-3 w-full max-w-xs"
                  >
                    <div
                      className="relative rounded-2xl px-5 py-3.5 text-center overflow-hidden"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.1))",
                        border: "1px solid rgba(16,185,129,0.35)",
                        boxShadow:
                          "0 0 40px rgba(16,185,129,0.25), 0 8px 32px rgba(0,0,0,0.3)",
                        backdropFilter: "blur(16px)",
                      }}
                    >
                      {/* Mini sparkle particles */}
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={`sp-${i}`}
                          className="absolute w-1.5 h-1.5 rounded-full"
                          style={{
                            background: [
                              "#fbbf24",
                              "#34d399",
                              "#a78bfa",
                              "#f472b6",
                              "#38bdf8",
                              "#fb923c",
                              "#4ade80",
                              "#e879f9",
                            ][i % 8],
                            left: "50%",
                            top: "50%",
                          }}
                          animate={{
                            x: [0, Math.cos((i / 8) * Math.PI * 2) * 80],
                            y: [0, Math.sin((i / 8) * Math.PI * 2) * 50],
                            opacity: [1, 0],
                            scale: [1, 0.3],
                          }}
                          transition={{
                            duration: 0.8,
                            delay: 0.1 + i * 0.04,
                            ease: "easeOut",
                          }}
                        />
                      ))}

                      {/* Simple celebration text */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.3, 1] }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                        className="flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5 text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                        <span className="text-xl font-black text-emerald-200 drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]">
                          Correct!
                        </span>
                        <motion.span
                          animate={{ rotate: [0, 15, -15, 0] }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                          className="text-lg"
                        >
                          🎉
                        </motion.span>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ═══ Leaderboard (between questions) ═══ */}
          {status === "leaderboard" &&
            (() => {
              const responseSeconds = responseTimeMs / 1000;
              const timeLimit = currentQuestion?.time_limit || 30;
              const speedRatio = responseSeconds / timeLimit;
              const speedLabel =
                speedRatio <= 0.15
                  ? "Lightning!"
                  : speedRatio <= 0.3
                    ? "Fast!"
                    : speedRatio <= 0.55
                      ? "Good"
                      : speedRatio <= 0.8
                        ? "Okay"
                        : "Slow";
              const speedColor =
                speedRatio <= 0.15
                  ? "text-yellow-300"
                  : speedRatio <= 0.3
                    ? "text-emerald-300"
                    : speedRatio <= 0.55
                      ? "text-cyan-300"
                      : speedRatio <= 0.8
                        ? "text-orange-300"
                        : "text-red-300";

              const reviewMedals = ["🥇", "🥈", "🥉"];
              const reviewMedalColors = [
                {
                  bg: "from-amber-400 to-yellow-600",
                  text: "text-amber-300",
                  glow: "shadow-[0_0_20px_rgba(251,191,36,0.5)]",
                },
                {
                  bg: "from-slate-300 to-slate-500",
                  text: "text-slate-300",
                  glow: "shadow-[0_0_16px_rgba(148,163,184,0.4)]",
                },
                {
                  bg: "from-amber-600 to-amber-800",
                  text: "text-amber-600",
                  glow: "shadow-[0_0_14px_rgba(180,83,9,0.35)]",
                },
              ];

              const top3 = leaderboard.slice(0, 3);
              const myEntry = leaderboard.find(
                (e: any) => e.nickname === user?.name,
              );
              const myRankIndex = leaderboard.findIndex(
                (e: any) => e.nickname === user?.name,
              );

              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.88, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 280, damping: 24 }}
                  className="flex-1 flex items-center justify-center px-3"
                >
                  <div
                    className="w-full max-w-5xl rounded-5xl p-10 md:p-16 min-h-[70vh] flex flex-col justify-center"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(10,10,30,0.82), rgba(10,10,30,0.92))",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow:
                        "0 16px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
                    }}
                  >
                    {/* Result header */}
                    {answerFeedback && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 200,
                          damping: 15,
                        }}
                        className="text-center mb-8"
                      >
                        {answerFeedback.isCorrect ? (
                          <motion.div
                            className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mb-4"
                            animate={{
                              boxShadow: [
                                "0 0 30px rgba(34,197,94,0.3)",
                                "0 0 50px rgba(34,197,94,0.55)",
                                "0 0 30px rgba(34,197,94,0.3)",
                              ],
                            }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <CheckCircle
                              className="w-14 h-14 text-white"
                              strokeWidth={2.5}
                            />
                          </motion.div>
                        ) : (
                          <motion.div
                            className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-red-400 to-pink-600 flex items-center justify-center mb-4"
                            style={{
                              boxShadow: "0 0 30px rgba(239,68,68,0.3)",
                            }}
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 0.6 }}
                          >
                            <XCircle
                              className="w-14 h-14 text-white"
                              strokeWidth={2.5}
                            />
                          </motion.div>
                        )}

                        <motion.h2
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className={`text-4xl md:text-5xl font-black font-display ${answerFeedback.isCorrect ? "text-green-400" : "text-red-400"}`}
                        >
                          {answerFeedback.isCorrect ? "Correct!" : "Incorrect"}
                        </motion.h2>
                      </motion.div>
                    )}

                    {!answerFeedback && (
                      <div className="text-center mb-8">
                        <div
                          className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center mb-4"
                          style={{ boxShadow: "0 0 30px rgba(139,92,246,0.3)" }}
                        >
                          <Clock
                            className="w-14 h-14 text-white"
                            strokeWidth={2.5}
                          />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black font-display text-purple-300">
                          Time&apos;s Up!
                        </h2>
                      </div>
                    )}

                    {/* Stats row: Points + Time */}
                    {answerFeedback && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center justify-center gap-4 mb-8"
                      >
                        <div
                          className="flex items-center gap-2 px-4 py-2 rounded-xl"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06))",
                            border: "1px solid rgba(251,191,36,0.25)",
                            boxShadow: "0 0 20px rgba(251,191,36,0.15)",
                          }}
                        >
                          <Star className="w-6 h-6 text-amber-400" />
                          <motion.span
                            className="text-2xl font-black gradient-text-amber"
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.3, 1] }}
                            transition={{ delay: 0.35, duration: 0.4 }}
                          >
                            +{answerFeedback.pointsAwarded}
                          </motion.span>
                          <span className="text-amber-200/60 text-base font-bold">
                            pts
                          </span>
                        </div>

                        {responseTimeMs > 0 && (
                          <div
                            className="flex items-center gap-2 px-3 py-2 rounded-xl"
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.1)",
                            }}
                          >
                            <Clock className="w-5 h-5 text-white/70" />
                            <span className="text-lg font-bold text-white/80">
                              {responseSeconds.toFixed(1)}s
                            </span>
                            <span
                              className={`text-base font-black uppercase tracking-wider ${speedColor}`}
                            >
                              {speedLabel}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Top players + your rank */}
                    {top3.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="rounded-2xl p-6 mb-6"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(15,15,35,0.7), rgba(15,15,35,0.85))",
                          border: "1px solid rgba(255,255,255,0.08)",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                        }}
                      >
                        <h3 className="font-bold text-white/70 mb-4 text-base uppercase tracking-[0.15em] flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-amber-400" /> Top
                          Players
                        </h3>
                        <div className="space-y-3">
                          {top3.map((entry: any, i: number) => {
                            const isMe = entry.nickname === user?.name;
                            const mc = reviewMedalColors[i];
                            return (
                              <motion.div
                                key={entry.rank || i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                  delay: 0.4 + i * 0.1,
                                  type: "spring",
                                  stiffness: 400,
                                  damping: 25,
                                }}
                                className={`flex items-center gap-4 py-3.5 px-4 rounded-xl transition-colors ${
                                  isMe
                                    ? "bg-purple-500/20 ring-1 ring-purple-400/30 shadow-[0_0_16px_rgba(139,92,246,0.25)]"
                                    : "bg-white/[0.03]"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">
                                    {reviewMedals[i]}
                                  </span>
                                  <div
                                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${mc.bg} flex items-center justify-center text-base font-black text-white border border-white/30 ${mc.glow}`}
                                  >
                                    {(entry.nickname || "?")
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                </div>
                                <span
                                  className={`flex-1 text-lg font-bold truncate ${isMe ? "text-cyan-300" : "text-white/80"}`}
                                >
                                  {entry.nickname}
                                  {isMe && (
                                    <span className="text-purple-300/70 text-base ml-1">
                                      (You)
                                    </span>
                                  )}
                                </span>
                                <motion.span
                                  className={`font-mono font-black text-lg ${mc.text}`}
                                  initial={isMe ? { scale: 0.8 } : {}}
                                  animate={isMe ? { scale: [0.8, 1.2, 1] } : {}}
                                  transition={{ delay: 0.7, duration: 0.4 }}
                                >
                                  {entry.score}
                                </motion.span>
                              </motion.div>
                            );
                          })}
                        </div>

                        {/* Show user's rank if not in top 3 */}
                        {myEntry && myRankIndex >= 3 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="mt-2.5 pt-2.5 border-t border-white/[0.06]"
                          >
                            <div className="flex items-center gap-4 py-3.5 px-4 rounded-xl bg-purple-500/15 ring-1 ring-purple-400/25">
                              <span className="text-white/40 font-mono font-bold text-base w-8 text-center">
                                #{myRankIndex + 1}
                              </span>
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-base font-black text-white border border-white/30">
                                {(myEntry.nickname || "?")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <span className="flex-1 text-lg font-bold text-cyan-300 truncate">
                                {myEntry.nickname}{" "}
                                <span className="text-purple-300/70 text-base">
                                  (You)
                                </span>
                              </span>
                              <span className="font-mono font-black text-lg text-purple-300">
                                {myEntry.score}
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}

                    {/* Next question countdown */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="rounded-xl p-6 text-center"
                      style={{
                        background: timeRemaining > 0
                          ? "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.1))"
                          : "rgba(255,255,255,0.03)",
                        border: timeRemaining > 0
                          ? "1px solid rgba(139,92,246,0.3)"
                          : "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {timeRemaining > 0 ? (
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-base font-bold uppercase tracking-widest text-purple-300/80">
                            Next question in
                          </span>
                          <motion.span
                            key={timeRemaining}
                            initial={{ scale: 1.4, opacity: 0.6 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-6xl font-black font-mono text-white drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]"
                          >
                            {timeRemaining}
                          </motion.span>
                          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-1">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                              animate={{ width: `${Math.max(0, (1 - timeRemaining / 5) * 100)}%` }}
                              transition={{ duration: 0.5, ease: "linear" }}
                            />
                          </div>
                        </div>
                      ) : (
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="flex items-center justify-center gap-2"
                        >
                          <Clock className="w-6 h-6 text-purple-300" />
                          <span className="text-lg font-medium text-purple-200/90">
                            Waiting for next question...
                          </span>
                        </motion.div>
                      )}
                    </motion.div>
                  </div>
                </motion.div>
              );
            })()}

          {/* ═══ Ended ═══ */}
          {status === "ended" &&
            (() => {
              const podiumOrder = leaderboard.slice(0, 3);
              const restPlayers = leaderboard.slice(3);
              const myRank = leaderboard.findIndex(
                (e: any) => e.nickname === user?.name,
              );

              const CONFETTI_COLORS = [
                "#fbbf24",
                "#a78bfa",
                "#34d399",
                "#f472b6",
                "#38bdf8",
                "#fb923c",
                "#e879f9",
                "#4ade80",
                "#facc15",
                "#22d3ee",
              ];
              const MEDAL_STYLES = [
                {
                  ring: "ring-amber-400/80",
                  gradient: "from-yellow-300 via-amber-400 to-yellow-600",
                  border: "border-amber-300/80",
                  glow: "shadow-[0_0_40px_rgba(251,191,36,0.5)]",
                  text: "text-amber-300",
                  podiumBg:
                    "from-amber-500/60 via-amber-600/50 to-amber-700/70",
                  podiumH: "h-[130px] md:h-[160px]",
                  podiumBorder: "border-amber-400/50",
                  avatarSize: "w-20 h-20 md:w-24 md:h-24",
                  fontSize: "text-2xl md:text-3xl",
                  medal: "🥇",
                },
                {
                  ring: "ring-slate-300/70",
                  gradient: "from-slate-200 via-slate-400 to-slate-600",
                  border: "border-slate-300/60",
                  glow: "shadow-[0_0_30px_rgba(148,163,184,0.4)]",
                  text: "text-slate-300",
                  podiumBg:
                    "from-slate-500/50 via-slate-600/45 to-slate-700/60",
                  podiumH: "h-[96px] md:h-[120px]",
                  podiumBorder: "border-slate-400/40",
                  avatarSize: "w-16 h-16 md:w-20 md:h-20",
                  fontSize: "text-xl md:text-2xl",
                  medal: "🥈",
                },
                {
                  ring: "ring-amber-700/60",
                  gradient: "from-amber-600 via-amber-700 to-amber-900",
                  border: "border-amber-700/50",
                  glow: "shadow-[0_0_25px_rgba(180,83,9,0.35)]",
                  text: "text-amber-600",
                  podiumBg:
                    "from-amber-700/45 via-amber-800/40 to-amber-900/55",
                  podiumH: "h-[72px] md:h-[90px]",
                  podiumBorder: "border-amber-700/35",
                  avatarSize: "w-14 h-14 md:w-18 md:h-18",
                  fontSize: "text-lg md:text-xl",
                  medal: "🥉",
                },
              ];

              // Podium display order: [2nd, 1st, 3rd]
              const podiumDisplay =
                podiumOrder.length >= 2
                  ? [
                      { data: podiumOrder[1], place: 1 },
                      { data: podiumOrder[0], place: 0 },
                      ...(podiumOrder[2]
                        ? [{ data: podiumOrder[2], place: 2 }]
                        : []),
                    ]
                  : podiumOrder.length === 1
                    ? [{ data: podiumOrder[0], place: 0 }]
                    : [];

              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                  className="flex-1 flex flex-col items-center justify-center px-4 py-6 md:px-6 md:py-8 relative overflow-hidden"
                >
                  {/* Ambient confetti */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                    {[...Array(28)].map((_, i) => (
                      <motion.div
                        key={`c-${i}`}
                        className="absolute rounded-sm"
                        style={{
                          width: 3 + Math.random() * 6,
                          height: 3 + Math.random() * 6,
                          background:
                            CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                          left: `${5 + Math.random() * 90}%`,
                          top: -12,
                        }}
                        animate={{
                          y: [
                            0,
                            typeof window !== "undefined"
                              ? window.innerHeight + 20
                              : 900,
                          ],
                          x: [0, (Math.random() - 0.5) * 180],
                          rotate: [0, 360 + Math.random() * 360],
                          opacity: [0.9, 0.9, 0],
                        }}
                        transition={{
                          duration: 3 + Math.random() * 2.5,
                          delay: Math.random() * 3,
                          repeat: Infinity,
                          repeatDelay: 1 + Math.random() * 4,
                          ease: "easeIn",
                        }}
                      />
                    ))}
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-5 md:gap-7 w-full max-w-2xl">
                    {/* ─── Title ─── */}
                    <motion.div
                      initial={{ opacity: 0, y: -30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 250,
                        damping: 22,
                        delay: 0.1,
                      }}
                      className="text-center"
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 200,
                          damping: 12,
                          delay: 0.15,
                        }}
                        className="inline-block mb-3"
                      >
                        <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_8px_30px_rgba(251,191,36,0.3)]">
                          <Trophy className="w-9 h-9 md:w-11 md:h-11 text-white drop-shadow-md" />
                        </div>
                      </motion.div>
                      <h2 className="text-3xl md:text-5xl font-black font-display gradient-text-pink-cyan neon-text leading-tight mb-2">
                        Quiz Finished!
                      </h2>
                      <p className="text-purple-200/50 text-sm md:text-lg">
                        Here are the final standings
                      </p>

                      {/* Score + Rank pills */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: 0.35,
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }}
                        className="flex items-center justify-center gap-2.5 mt-4 flex-wrap"
                      >
                        <div
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full backdrop-blur-xl"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06))",
                            border: "1px solid rgba(251,191,36,0.25)",
                            boxShadow: "0 4px 20px rgba(251,191,36,0.15)",
                          }}
                        >
                          <Star className="w-4 h-4 text-amber-400" />
                          <span className="text-lg font-black gradient-text-amber">
                            <CountUp target={totalScore} />
                          </span>
                          <span className="text-amber-200/60 text-xs font-bold">
                            pts
                          </span>
                        </div>

                        {myRank >= 0 && (
                          <div
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full backdrop-blur-xl"
                            style={{
                              background:
                                myRank === 0
                                  ? "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.08))"
                                  : myRank <= 2
                                    ? "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(109,40,217,0.06))"
                                    : "rgba(255,255,255,0.05)",
                              border:
                                myRank === 0
                                  ? "1px solid rgba(251,191,36,0.25)"
                                  : "1px solid rgba(255,255,255,0.12)",
                            }}
                          >
                            <Trophy
                              className={`w-4 h-4 ${myRank === 0 ? "text-amber-400" : myRank === 1 ? "text-slate-300" : myRank === 2 ? "text-amber-600" : "text-purple-300"}`}
                            />
                            <span
                              className={`text-sm font-black ${myRank === 0 ? "text-amber-300" : myRank === 1 ? "text-slate-200" : myRank === 2 ? "text-amber-500" : "text-white/70"}`}
                            >
                              Rank #{myRank + 1}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    </motion.div>

                    {/* ─── 3D Podium section ─── */}
                    {podiumDisplay.length > 0 && (
                      <div
                        className="w-full max-w-lg"
                        style={{ perspective: "900px" }}
                      >
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[70%] h-10 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent blur-xl rounded-full" />

                        <div
                          className={`flex items-end justify-center ${podiumDisplay.length === 1 ? "gap-0" : "gap-2 md:gap-4"}`}
                        >
                          {podiumDisplay.map(({ data, place }) => {
                            const s = MEDAL_STYLES[place];
                            const isMe = data.nickname === user?.name;
                            const isFirst = place === 0;
                            const entryDelay =
                              place === 0 ? 0.3 : place === 1 ? 0.55 : 0.75;

                            return (
                              <motion.div
                                key={`podium-${place}`}
                                initial={{ opacity: 0, y: 90 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  delay: entryDelay,
                                  type: "spring",
                                  stiffness: 200,
                                  damping: 18,
                                }}
                                className={`flex flex-col items-center ${podiumDisplay.length === 1 ? "" : "flex-1"} ${isFirst ? "max-w-[200px]" : "max-w-[170px]"}`}
                              >
                                {isFirst && (
                                  <motion.div
                                    animate={{ y: [0, -6, 0] }}
                                    transition={{
                                      duration: 2.5,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                    }}
                                    className="text-2xl md:text-3xl mb-1"
                                  >
                                    👑
                                  </motion.div>
                                )}

                                <motion.div
                                  className={`${s.avatarSize} rounded-full bg-gradient-to-br ${s.gradient} flex items-center justify-center ${s.fontSize} font-black text-white border-[3px] ${s.border} ${s.glow} mb-2 relative ${isMe ? `ring-2 ${s.ring} ring-offset-1 ring-offset-slate-900` : ""}`}
                                  animate={
                                    isFirst
                                      ? {
                                          boxShadow: [
                                            "0 0 25px rgba(251,191,36,0.3)",
                                            "0 0 55px rgba(251,191,36,0.6)",
                                            "0 0 25px rgba(251,191,36,0.3)",
                                          ],
                                        }
                                      : {}
                                  }
                                  transition={
                                    isFirst
                                      ? { duration: 2.5, repeat: Infinity }
                                      : {}
                                  }
                                >
                                  {(data.nickname || "?")
                                    .charAt(0)
                                    .toUpperCase()}
                                  <span className="absolute -bottom-1 -right-1 text-sm md:text-base drop-shadow-lg">
                                    {s.medal}
                                  </span>
                                </motion.div>

                                <span
                                  className={`text-xs md:text-sm font-bold truncate max-w-full leading-tight ${isMe ? "text-cyan-300" : "text-white/85"}`}
                                >
                                  {data.nickname}
                                  {isMe ? " (You)" : ""}
                                </span>

                                <motion.span
                                  className={`font-mono font-black text-xs md:text-sm ${s.text} mt-0.5`}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: [0, 1.2, 1] }}
                                  transition={{
                                    delay: entryDelay + 0.3,
                                    duration: 0.35,
                                  }}
                                >
                                  {data.score || 0} pts
                                </motion.span>

                                {/* Response time */}
                                {data.totalResponseTime != null &&
                                  data.totalResponseTime > 0 && (
                                    <motion.span
                                      className="text-[10px] md:text-xs font-bold text-white/40 mt-0.5 flex items-center gap-1"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{
                                        delay: entryDelay + 0.5,
                                      }}
                                    >
                                      <Clock className="w-3 h-3" />
                                      {(data.totalResponseTime / 1000).toFixed(
                                        1,
                                      )}
                                      s
                                    </motion.span>
                                  )}

                                <motion.div
                                  initial={{ scaleY: 0 }}
                                  animate={{ scaleY: 1 }}
                                  transition={{
                                    delay: entryDelay + 0.1,
                                    duration: 0.5,
                                    ease: [0.34, 1.56, 0.64, 1],
                                  }}
                                  className={`w-full mt-2 ${s.podiumH} rounded-t-xl relative overflow-hidden origin-bottom`}
                                  style={{
                                    background:
                                      "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
                                    backdropFilter: "blur(12px)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    boxShadow:
                                      "inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 32px rgba(0,0,0,0.4)",
                                  }}
                                >
                                  <div
                                    className={`absolute inset-0 bg-gradient-to-b ${s.podiumBg} opacity-80`}
                                  />
                                  <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                                  <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-white/15 to-transparent" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span
                                      className={`font-black text-white/15 ${isFirst ? "text-5xl md:text-6xl" : "text-4xl md:text-5xl"}`}
                                    >
                                      {place + 1}
                                    </span>
                                  </div>
                                </motion.div>
                              </motion.div>
                            );
                          })}
                        </div>

                        <motion.div
                          initial={{ opacity: 0, scaleX: 0.7 }}
                          animate={{ opacity: 1, scaleX: 1 }}
                          transition={{ delay: 0.6, duration: 0.4 }}
                          className="w-full h-2 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full"
                        />
                      </div>
                    )}

                    {/* ─── Leaderboard list ─── */}
                    {restPlayers.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 25 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 }}
                        className="w-full max-w-md rounded-2xl overflow-hidden backdrop-blur-xl"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(15,15,35,0.7), rgba(15,15,35,0.85))",
                          border: "1px solid rgba(255,255,255,0.08)",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                        }}
                      >
                        <div className="px-5 py-3 border-b border-white/5">
                          <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.15em]">
                            Other Players
                          </h3>
                        </div>
                        <div className="p-2.5 space-y-0.5">
                          {restPlayers
                            .slice(0, 7)
                            .map((entry: any, i: number) => {
                              const isMe = entry.nickname === user?.name;
                              return (
                                <motion.div
                                  key={entry.rank || i}
                                  initial={{ opacity: 0, x: -15 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 1.1 + i * 0.06 }}
                                  whileHover={{
                                    backgroundColor: "rgba(255,255,255,0.04)",
                                  }}
                                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${isMe ? "bg-purple-500/12 ring-1 ring-purple-400/20" : ""}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-white/30 font-mono font-bold text-xs w-6 text-center">
                                      {i + 4}
                                    </span>
                                    <div
                                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${["from-purple-500 to-indigo-600", "from-pink-500 to-rose-600", "from-cyan-500 to-blue-600", "from-amber-500 to-orange-600", "from-green-500 to-emerald-600"][i % 5]} flex items-center justify-center text-xs font-bold text-white`}
                                    >
                                      {(entry.nickname || "?")
                                        .charAt(0)
                                        .toUpperCase()}
                                    </div>
                                    <span
                                      className={`text-sm font-medium ${isMe ? "text-cyan-300 font-bold" : "text-white/70"}`}
                                    >
                                      {entry.nickname}
                                      {isMe ? " (You)" : ""}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-xs text-white/40">
                                      {entry.score || 0}
                                    </span>
                                    {entry.totalResponseTime != null &&
                                      entry.totalResponseTime > 0 && (
                                        <span className="text-[10px] font-bold text-white/30 flex items-center gap-0.5">
                                          <Clock className="w-2.5 h-2.5" />
                                          {(
                                            entry.totalResponseTime / 1000
                                          ).toFixed(1)}
                                          s
                                        </span>
                                      )}
                                  </div>
                                </motion.div>
                              );
                            })}
                        </div>
                      </motion.div>
                    )}

                    {/* ─── Action button ─── */}
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.3 }}
                      onClick={() => {
                        if (isGuest) {
                          logout();
                        } else {
                          disconnectSocket();
                          resetSession();
                        }
                        router.replace(exitPath);
                      }}
                      className="btn-cartoon btn-cartoon-pink px-8 py-4 rounded-2xl font-bold text-lg"
                    >
                      {isGuest ? "Back to Home" : "Return to Dashboard"}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })()}
        </div>
      </div>
    </div>
  );
}
