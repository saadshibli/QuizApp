"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import SpaceBackground from "@/components/SpaceBackground";
import { useAuthStore } from "@/lib/store/authStore";
import { useRouter, useParams } from "next/navigation";
import { sessionAPI, quizAPI } from "@/lib/api";
import Image from "next/image";

import {
  initializeSocket,
  getSocket,
  disconnectSocket,
  waitForAuth,
} from "@/lib/socket";
import toast from "react-hot-toast";
import {
  Play,
  Users,
  Copy,
  ArrowRight,
  Activity,
  Zap,
  Trophy,
  Clock,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";

const AVATAR_GRADIENTS = [
  "from-purple-500 to-indigo-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-amber-500 to-orange-600",
  "from-green-500 to-emerald-600",
  "from-red-500 to-pink-600",
  "from-indigo-500 to-purple-600",
  "from-teal-500 to-cyan-600",
];

export default function HostSessionPage() {
  const router = useRouter();
  const params = useParams();

  const urlParam = params.id as string;

  const { token, user, _hasHydrated } = useAuthStore();
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionCode, setSessionCode] = useState<string>("");
  const [notFound, setNotFound] = useState(false);
  const [, setQuizTitle] = useState<string>("");
  const [players, setPlayers] = useState<any[]>([]);
  const [sessionState, setSessionState] = useState<
    "waiting" | "startCountdown" | "active" | "leaderboard" | "finished"
  >("waiting");
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [startupCountdown, setStartupCountdown] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [advanceMode, setAdvanceMode] = useState<"auto" | "manual">("auto");
  const [advanceSeconds, setAdvanceSeconds] = useState(5);

  // Normalize & deduplicate leaderboard entries
  const normalizeLeaderboard = (entries: any[]) => {
    const seen = new Set<string>();
    return entries
      .map((e: any) => ({
        ...e,
        participant_id: e.participant_id ?? e.participantId,
        user_id: e.user_id ?? e.userId ?? null,
        totalResponseTime:
          Number(e.totalResponseTime ?? e.total_response_time) || 0,
        score: e.score ?? e.total_score ?? 0,
      }))
      .filter((e: any) => {
        const key = String(e.participant_id || e.user_id || e.nickname);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a: any, b: any) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.totalResponseTime - b.totalResponseTime;
      });
  };
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [answerStats, setAnswerStats] = useState<Record<number, number>>({});
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [themeImage, setThemeImage] = useState<string>("");
  const serverOffsetRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(0);
  const questionDurationRef = useRef<number>(30);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);
  const isAdvancingRef = useRef(false);
  const sessionStateRef = useRef(sessionState);
  sessionStateRef.current = sessionState;
  const [leaderboardCountdown, setLeaderboardCountdown] = useState(0);
  const leaderboardTimerRef = useRef<NodeJS.Timeout | null>(null);

  const joinUrl =
    typeof window !== "undefined" && sessionCode
      ? window.location.origin + "/join-quiz?code=" + sessionCode
      : "";

  const [recentJoins, setRecentJoins] = useState<
    { id: string; name: string }[]
  >([]);
  const prevPlayersRef = useRef<any[]>([]);

  useEffect(() => {
    // Check for new players
    if (players.length > prevPlayersRef.current.length) {
      const newPlayers = players.filter(
        (p1) => !prevPlayersRef.current.find((p2) => p2.user_id === p1.user_id),
      );
      if (newPlayers.length > 0) {
        const joins = newPlayers.map((p) => ({
          id: Math.random().toString(),
          name: p.nickname || p.username || "Someone",
        }));

        setRecentJoins((prev) => [...prev, ...joins]);

        joins.forEach((join) => {
          setTimeout(() => {
            setRecentJoins((prev) => prev.filter((j) => j.id !== join.id));
          }, 4000);
        });
      }
    }
    prevPlayersRef.current = players;
  }, [players]);

  // Helper to create a URL-friendly slug from quiz title
  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "quiz";

  useEffect(() => {
    if (!token && !_hasHydrated) return; // wait for hydration only if no token yet
    if (!token) {
      router.replace("/login");
      return;
    }
    if (user?.role !== "teacher" && user?.role !== "admin") {
      router.replace("/student/dashboard");
      return;
    }

    // Determine the actual session code from URL param
    let code = urlParam;
    if (!/^\d{6}$/.test(urlParam) && typeof window !== "undefined") {
      // URL param is a slug — look up real code from sessionStorage
      const stored = sessionStorage.getItem(`ss_slug_${urlParam}`);
      if (stored && /^\d{6}$/.test(stored)) {
        code = stored;
      } else {
        setNotFound(true);
        return;
      }
    }

    // Look up session by code to get the numeric ID
    let cancelled = false;
    sessionAPI
      .getSessionByCode(code)
      .then((res) => {
        if (cancelled) return;
        const numericId = String(res.data?.session?.id);
        if (!numericId || numericId === "undefined") {
          setNotFound(true);
          return;
        }
        setSessionId(numericId);
        setSessionCode(code);
        setQuizTitle(res.data?.session?.quiz_title || "");

        // Replace URL with quiz title slug
        const title = res.data?.session?.quiz_title;
        if (title && typeof window !== "undefined") {
          const slug = slugify(title);
          sessionStorage.setItem(`ss_slug_${slug}`, code);
          window.history.replaceState(null, "", `/session/${slug}`);
        }

        // Populate players from API response immediately (don't wait for socket)
        const apiParticipants = res.data?.participants;
        if (apiParticipants && apiParticipants.length > 0) {
          setPlayers(
            apiParticipants.map((p: any) => ({
              id: p.user_id || p.id,
              username: p.nickname || p.name || "Player",
              score: p.score || 0,
              avatar: p.avatar || null,
            })),
          );
        }

        // Fetch theme
        const theme = res.data?.session?.quiz_theme;
        if (theme && theme !== "none") {
          setThemeImage(`/themes/${theme}.png`);
        }

        // If session is already completed, load leaderboard immediately
        const status = res.data?.session?.status;
        if (status === "Completed") {
          setSessionState("finished");
          sessionAPI
            .getLeaderboard(numericId)
            .then((lbRes) => {
              if (!cancelled) {
                setLeaderboard(normalizeLeaderboard(lbRes.data || []));
              }
            })
            .catch(() => {});
        } else if (status === "Active") {
          // Teacher refreshed mid-quiz — recover current question state
          const currentQuestionId = res.data?.session?.current_question;
          const quizId = res.data?.session?.quiz_id;
          if (currentQuestionId && quizId) {
            quizAPI
              .getQuiz(quizId)
              .then((quizRes) => {
                if (cancelled) return;
                const questions = quizRes.data?.questions || [];
                const currentQ = questions.find(
                  (q: any) => q.id === currentQuestionId,
                );
                if (currentQ) {
                  const qIndex = questions.findIndex(
                    (q: any) => q.id === currentQuestionId,
                  );
                  setCurrentQuestion({
                    text: currentQ.question_text,
                    options: currentQ.options?.map((o: any) => ({
                      id: o.id,
                      text: o.option_text,
                      is_correct: o.is_correct,
                    })),
                    id: currentQ.id,
                    points: currentQ.points || 100,
                    time_limit: currentQ.time_limit || 30,
                  });
                  setCurrentQuestionIndex(qIndex >= 0 ? qIndex : 0);
                  setTotalQuestions(questions.length);
                  // Go to leaderboard state since we can't recover timer mid-question
                  setSessionState("leaderboard");
                }
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotFound(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [_hasHydrated, token, urlParam, router]);

  useEffect(() => {
    if (!sessionId || !token) return;

    // Initialize shared socket connection
    const socket = initializeSocket(token);
    let initialJoinDone = false;

    const joinAsHost = () => {
      socket.emit("HostJoinSession", { sessionId });
    };

    // On initial connect/auth, join room
    waitForAuth()
      .then(() => {
        joinAsHost();
        initialJoinDone = true;
      })
      .catch((err) => console.error("[Host] Socket auth failed:", err));

    // Re-join session room after reconnect
    const onReAuthenticated = () => {
      if (!initialJoinDone) return;
      joinAsHost();
    };
    socket.on("authenticated", onReAuthenticated);

    socket.on("HostSessionJoined", (data: any) => {
      if (data.participants) {
        setPlayers(
          data.participants.map((p: any) => ({
            id: p.user_id || p.id,
            username: p.nickname || p.name || "Player",
            score: p.score || 0,
            avatar: p.avatar || null,
          })),
        );
      }
    });

    socket.on("ParticipantJoined", (data: any) => {
      const participant = data.participant;
      if (participant) {
        setPlayers((prev) => {
          const existing = prev.find(
            (p) => p.id === participant.user_id || p.id === participant.id,
          );
          if (!existing) {
            return [
              ...prev,
              {
                id: participant.user_id || participant.id,
                username: participant.nickname || "Player",
                score: 0,
                avatar: participant.avatar || null,
              },
            ];
          }
          return prev;
        });
        toast.success(`${participant.nickname || "A player"} joined!`);
      }
    });

    socket.on("ParticipantLeft", (data: any) => {
      if (data?.participantId) {
        setPlayers((prev) => prev.filter((p) => p.id !== data.participantId));
      }
    });

    // Listen for individual answer submissions (broadcast to room)
    socket.on("AnswerSubmitted", (data: any) => {
      if (data.optionId) {
        setAnswerStats((prev) => ({
          ...prev,
          [data.optionId]: (prev[data.optionId] || 0) + 1,
        }));
        setTotalAnswers((prev) => prev + 1);
      }
    });

    socket.on("ServerTime", (data: any) => {
      serverOffsetRef.current = (data.serverTime || Date.now()) - Date.now();
    });

    socket.on("QuestionStarted", (data: any) => {
      // Recalibrate server offset every question for accuracy
      if (data.serverTime) {
        serverOffsetRef.current = data.serverTime - Date.now();
      }
      setAnswerStats({});
      setTotalAnswers(0);

      questionStartTimeRef.current = data.questionStartTime || Date.now();
      questionDurationRef.current = data.timeLimit || 30;

      if (data.totalQuestions) setTotalQuestions(data.totalQuestions);
      if (data.currentQuestionIndex !== undefined)
        setCurrentQuestionIndex(data.currentQuestionIndex);
      if (data.advanceMode) setAdvanceMode(data.advanceMode);
      if (data.advanceSeconds) setAdvanceSeconds(data.advanceSeconds);

      const adjustedNow = Date.now() + serverOffsetRef.current;
      const untilStart = questionStartTimeRef.current - adjustedNow;

      if (untilStart > 1000) {
        setStartupCountdown(Math.ceil(untilStart / 1000));
        setTimeRemaining(data.timeLimit || 30);
        setSessionState("startCountdown");
      } else {
        setTimeRemaining(data.timeLimit || 30);
        setSessionState("active");
      }
    });

    socket.on("LeaderboardUpdate", (data: any) => {
      setLeaderboard(normalizeLeaderboard(data.leaderboard || []));
    });

    socket.on("QuizEnded", (data: any) => {
      setSessionState("finished");
      if (data.finalLeaderboard) {
        setLeaderboard(normalizeLeaderboard(data.finalLeaderboard));
      }
      toast("Session ended!", { icon: "🏁" });
    });

    // Handle server-side auto-end of a question (safety net if host timer drifts)
    socket.on("QuestionEnded", (data: any) => {
      if (sessionStateRef.current === "active") {
        setSessionState("leaderboard");
      }
      if (data?.leaderboard) {
        setLeaderboard(normalizeLeaderboard(data.leaderboard));
      }
    });

    return () => {
      socket.off("authenticated", onReAuthenticated);
      socket.off("HostSessionJoined");
      socket.off("ParticipantJoined");
      socket.off("ParticipantLeft");
      socket.off("AnswerSubmitted");
      socket.off("ServerTime");
      socket.off("QuestionStarted");
      socket.off("LeaderboardUpdate");
      socket.off("QuizEnded");
      socket.off("QuestionEnded");
    };
  }, [token, sessionId]);

  // Periodic participant refresh — safety net in case socket events are missed
  useEffect(() => {
    if (!sessionId || !token || sessionState !== "waiting") return;
    const interval = setInterval(() => {
      sessionAPI
        .getSession(sessionId)
        .then((res) => {
          const apiParticipants = res.data?.participants;
          if (apiParticipants) {
            setPlayers((prev) => {
              // Only update if the count changed (avoids unnecessary re-renders)
              if (apiParticipants.length !== prev.length) {
                return apiParticipants.map((p: any) => ({
                  id: p.user_id || p.id,
                  username: p.nickname || p.name || "Player",
                  score: p.score || 0,
                  avatar: p.avatar || null,
                }));
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [sessionId, token, sessionState]);

  // Disconnect socket only on true component unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  // Single unified timer loop — handles startCountdown + active states
  useEffect(() => {
    if (sessionState !== "startCountdown" && sessionState !== "active") return;

    const tick = setInterval(() => {
      const adjustedNow = Date.now() + serverOffsetRef.current;

      if (sessionState === "startCountdown") {
        const remaining = Math.max(
          0,
          Math.ceil((questionStartTimeRef.current - adjustedNow) / 1000),
        );
        setStartupCountdown(remaining);
        if (remaining <= 0) {
          setSessionState("active");
        }
        return;
      }

      // sessionState === "active"
      const deadline =
        questionStartTimeRef.current + questionDurationRef.current * 1000;
      const remaining = Math.min(
        questionDurationRef.current,
        Math.max(0, Math.ceil((deadline - adjustedNow) / 1000)),
      );
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(tick);
        const socket = getSocket();
        if (socket && currentQuestion?.options) {
          const correct = currentQuestion.options.find(
            (o: any) => o.is_correct,
          );
          socket.emit("broadcastQuestionEnded", {
            sessionId: parseInt(sessionId),
            correctOptionId: correct?.id,
          });
        }
        setSessionState("leaderboard");
      }
    }, 250);

    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState, currentQuestion?.id, sessionId]);

  const handleStartSession = async () => {
    if (!sessionId) return;
    if (players.length === 0) {
      toast.error("Cannot start without players!");
      return;
    }
    setIsActionLoading(true);
    setAnswerStats({});
    setTotalAnswers(0);
    try {
      // Start quiz via HTTP API — this sets current_question to questions[0]
      await sessionAPI.startQuiz(sessionId);
      toast.success("Session started!");

      // Get the session — current_question is already set to the first question by startQuiz
      const sessionRes = await sessionAPI.getSession(sessionId);
      const session = sessionRes.data.session;
      const currentQuestionId = session?.current_question;

      if (currentQuestionId) {
        // Fetch quiz details to get question content
        const fullQuizRes = await quizAPI.getQuiz(session.quiz_id);
        const currentQ = fullQuizRes.data?.questions?.find(
          (q: any) => q.id === currentQuestionId,
        );

        if (currentQ) {
          const socket = getSocket();
          if (socket) {
            socket.emit("broadcastQuestionStarted", {
              sessionId: parseInt(sessionId),
              question: currentQ,
            });
          }
          setCurrentQuestion({
            text: currentQ.question_text,
            options: currentQ.options?.map((o: any) => ({
              id: o.id,
              text: o.option_text,
              is_correct: o.is_correct,
            })),
            id: currentQ.id,
            points: currentQ.points || 100,
            time_limit: currentQ.time_limit || 30,
          });
          setTimeRemaining(currentQ.time_limit || 30);
          setCurrentQuestionIndex(0);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to start session");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleNextQuestion = useCallback(async () => {
    setIsActionLoading(true);
    try {
      const res = await sessionAPI.nextQuestion(sessionId);

      // Check if session is now completed
      if (res.data.status === "Completed") {
        setSessionState("finished");
        // Fetch leaderboard
        const lbRes = await sessionAPI.getLeaderboard(sessionId);
        setLeaderboard(normalizeLeaderboard(lbRes.data || []));

        const socket = getSocket();
        if (socket) {
          socket.emit("broadcastQuizEnded", {
            sessionId: parseInt(sessionId),
            finalLeaderboard: lbRes.data,
          });
        }
        toast("Quiz completed!", { icon: "🏁" });
        return;
      }

      // Get updated session for current question
      const sessionRes = await sessionAPI.getSession(sessionId);
      const currentQuestionId = sessionRes.data.session?.current_question;

      if (currentQuestionId) {
        const fullQuizRes = await quizAPI.getQuiz(
          sessionRes.data.session.quiz_id,
        );
        const currentQ = fullQuizRes.data?.questions?.find(
          (q: any) => q.id === currentQuestionId,
        );

        if (currentQ) {
          const socket = getSocket();
          if (socket) {
            socket.emit("broadcastQuestionStarted", {
              sessionId: parseInt(sessionId),
              question: currentQ,
            });
          }
          // Don't set sessionState or timeRemaining here — let the socket echo
          // (QuestionStarted handler) do it so teacher and students are in sync.
          setCurrentQuestion({
            text: currentQ.question_text,
            options: currentQ.options?.map((o: any) => ({
              id: o.id,
              text: o.option_text,
              is_correct: o.is_correct,
            })),
            id: currentQ.id,
            points: currentQ.points || 100,
            time_limit: currentQ.time_limit || 30,
          });
          setCurrentQuestionIndex((prev) => prev + 1);
        }
      }

      // Update leaderboard
      const lbRes = await sessionAPI.getLeaderboard(sessionId);
      setLeaderboard(normalizeLeaderboard(lbRes.data || []));
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to load next question",
      );
    } finally {
      setIsActionLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Auto-advance to next question after leaderboard display
  useEffect(() => {
    if (sessionState !== "leaderboard" || isActionLoading) return;
    if (advanceMode === "manual") return; // manual mode: teacher clicks Next
    if (isAdvancingRef.current) return; // already advancing, don't double-trigger

    const delay = Math.max(1, Number(advanceSeconds) || 5);
    setLeaderboardCountdown(delay);

    // Visual countdown tick
    leaderboardTimerRef.current = setInterval(() => {
      setLeaderboardCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    autoAdvanceRef.current = setTimeout(() => {
      isAdvancingRef.current = true;
      handleNextQuestion().finally(() => {
        isAdvancingRef.current = false;
      });
    }, delay * 1000);

    return () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }
      if (leaderboardTimerRef.current) {
        clearInterval(leaderboardTimerRef.current);
        leaderboardTimerRef.current = null;
      }
      setLeaderboardCountdown(0);
    };
  }, [
    sessionState,
    isActionLoading,
    handleNextQuestion,
    advanceMode,
    advanceSeconds,
  ]);

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success("✓ Link copied to clipboard!", { duration: 2500 });
    setTimeout(() => setCopied(false), 2000);
  };

  // ---------------- Not Found ----------------
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
            This session doesn&apos;t exist or has already ended.
          </p>
          <button
            type="button"
            onClick={() => router.replace("/teacher/dashboard")}
            className="btn-cartoon btn-cartoon-pink px-6 py-2 text-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ---------------- Render Waiting Room ----------------
  if (sessionState === "waiting") {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden flex flex-col font-sans">
        <div className="fixed inset-0 z-0 bg-deep pointer-events-none">
          <SpaceBackground />
          {themeImage && (
            <Image
              src={themeImage}
              alt=""
              fill
              sizes="100vw"
              priority
              className="absolute inset-0 object-cover opacity-60 z-0"
              onError={() => setThemeImage("")}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-deep via-transparent to-transparent z-10" />
        </div>

        <div className="relative z-10 flex-1 w-full flex flex-col text-white p-4 md:p-6 lg:p-8">
          <header className="bg-deep/70 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-4 rounded-3xl z-10 flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-purple-500/20 text-purple-400 p-3 rounded-2xl border border-purple-500/30">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black font-display gradient-text-pink-cyan">
                  Lobby
                </h2>
                <div className="text-sm font-medium text-purple-300/70 flex items-center gap-2">
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="inline-block w-2 h-2 rounded-full bg-purple-400"
                  />
                  Waiting for players
                  <motion.span
                    animate={{ opacity: [1, 0.5] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  >
                    <span className="inline-block w-1">.</span>
                    <motion.span
                      animate={{ opacity: [0.5, 1] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: 0.2,
                      }}
                      className="inline-block w-1"
                    >
                      .
                    </motion.span>
                    <motion.span
                      animate={{ opacity: [0.5, 1] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: 0.4,
                      }}
                      className="inline-block w-1"
                    >
                      .
                    </motion.span>
                  </motion.span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <motion.div
                className="cartoon-panel px-5 py-3 rounded-2xl flex gap-3 items-center shadow-xl relative overflow-hidden"
                animate={players.length > 0 ? { scale: [1, 1.05, 1] } : {}}
                transition={
                  players.length > 0 ? { duration: 1.5, repeat: Infinity } : {}
                }
              >
                {players.length > 0 && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                <Users size={20} className="text-cyan-400 relative z-10" />
                <div className="flex flex-col relative z-10">
                  <motion.span
                    className="font-black text-xl leading-none text-white"
                    animate={players.length > 0 ? { scale: [1, 1.1, 1] } : {}}
                    transition={
                      players.length > 0 ? { duration: 0.5, delay: 0.1 } : {}
                    }
                  >
                    {players.length}
                  </motion.span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300/70 leading-none mt-1">
                    {players.length === 1 ? "Player" : "Players"}
                  </span>
                </div>
                {players.length > 0 && (
                  <motion.div
                    className="ml-2 inline-block"
                    animate={{ scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                  >
                    ✓
                  </motion.div>
                )}
              </motion.div>
            </div>
          </header>

          <main className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 w-full max-w-7xl mx-auto h-full overflow-hidden">
            {/* Left Col: Code, QR, and Start Action */}
            <div className="flex-[4] flex flex-col gap-6 relative">
              <div className="bg-deep/70 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center relative p-4 sm:p-8 h-full rounded-3xl overflow-hidden group">
                <div
                  className="absolute top-0 right-0 w-64 h-64 bg-pink-500/20 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse"
                  style={{ animationDuration: "4s" }}
                />
                <div
                  className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/20 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none animate-pulse"
                  style={{ animationDuration: "5s", animationDelay: "0.5s" }}
                />

                <motion.h2
                  className="text-2xl sm:text-4xl md:text-[3.5rem] font-black mb-4 sm:mb-8 font-display text-white text-center leading-tight z-10"
                  animate={{ y: [0, -5, 0] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <span className="gradient-text-pink-cyan drop-shadow-lg">
                    Let&apos;s get ready
                  </span>
                  <br />
                  to play!
                </motion.h2>

                <div className="flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-6 md:gap-10 mb-6 sm:mb-10 w-full max-w-3xl z-10 cartoon-panel-soft rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 md:px-10 border border-white/20 shadow-2xl relative overflow-hidden">
                  {/* Subtle background flair */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />

                  {/* Left: QR Code without pulse */}
                  <div className="shrink-0 flex flex-col items-center justify-center relative z-10">
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="p-3 bg-white rounded-2xl shadow-lg border-4 border-white/40 hover:scale-105 transition-transform duration-300 relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 to-purple-500/30 rounded-2xl blur-md -z-10 opacity-70" />
                      <QRCodeSVG
                        value={joinUrl}
                        size={100}
                        className="sm:hidden"
                      />
                      <QRCodeSVG
                        value={joinUrl}
                        size={140}
                        className="hidden sm:block"
                      />
                    </motion.div>
                    <motion.span
                      className="mt-3 text-pink-300 text-[11px] font-black uppercase tracking-widest bg-pink-500/10 px-3 py-1 rounded-full border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.25)] flex items-center gap-2"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                    >
                      <motion.span
                        animate={{ opacity: [0.6, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        •
                      </motion.span>
                      Scan to Join
                    </motion.span>
                  </div>

                  {/* Divider (visible on md+) */}
                  <div className="hidden md:block w-px h-32 bg-gradient-to-b from-transparent via-white/20 to-transparent z-10"></div>

                  {/* Right: Game Code */}
                  <div className="flex-1 flex flex-col items-center justify-center w-full z-10">
                    <span className="text-purple-300/80 text-xs font-black tracking-widest uppercase mb-2">
                      Or use game code
                    </span>
                    <motion.div
                      className="cursor-pointer group flex flex-col items-center justify-center w-full py-8 px-6 hover:bg-white/10 rounded-3xl transition-all relative"
                      onClick={copyLink}
                      title="Click code to copy link"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <motion.span
                        className="text-4xl sm:text-6xl md:text-[5.5rem] font-black text-white tracking-[0.1em] sm:tracking-[0.15em] drop-shadow-md group-hover:scale-110 transition-transform duration-500 leading-tight mb-2 sm:mb-4"
                        animate={copied ? { scale: [1, 1.1, 1] } : {}}
                      >
                        {sessionCode}
                      </motion.span>
                      <motion.span
                        className="text-sm font-bold text-white/50 group-hover:text-white transition-colors flex items-center gap-2 mt-4"
                        animate={copied ? { opacity: 0.5 } : {}}
                      >
                        {copied ? (
                          <>
                            <motion.span
                              animate={{ scale: [0.8, 1.2, 1] }}
                              className="inline-block"
                            >
                              ✓
                            </motion.span>{" "}
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={14} /> Click code to copy link
                          </>
                        )}
                      </motion.span>
                    </motion.div>
                  </div>
                </div>

                <motion.button
                  whileHover={{
                    scale: players.length > 0 ? 1.08 : 1,
                  }}
                  whileTap={{ scale: players.length > 0 ? 0.95 : 1 }}
                  onClick={handleStartSession}
                  disabled={isActionLoading || players.length === 0}
                  className="relative group w-full max-w-md z-10"
                >
                  <div
                    className={`absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-3xl blur opacity-70 group-hover:opacity-100 transition duration-200 group-hover:duration-200 ${players.length > 0 ? "animate-pulse" : "hidden"}`}
                    style={{ animationDuration: "2s" }}
                  ></div>
                  <div className="relative w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-80 px-4 sm:px-8 py-3 sm:py-5 rounded-2xl sm:rounded-3xl font-black flex justify-center gap-2 sm:gap-3 items-center text-lg sm:text-2xl shadow-[0_8px_20px_rgba(236,72,153,0.3)] transition-all border border-white/20 overflow-hidden group">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                      animate={players.length > 0 ? { x: [-100, 100] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      style={{ pointerEvents: "none" }}
                    />
                    <Play size={28} fill="currentColor" />{" "}
                    <span className="relative">
                      {isActionLoading ? "Starting..." : "Start Quiz"}
                    </span>
                  </div>
                </motion.button>
              </div>
            </div>

            {/* Right Col: Players Grid */}
            <div className="flex-[3] relative flex flex-col pt-4 md:pt-0 overflow-visible">
              {/* Floating Live Activity Feed */}
              <div className="absolute top-0 md:-top-4 right-0 left-0 h-16 flex flex-col justify-end items-end gap-2 z-20 pointer-events-none pr-2">
                <AnimatePresence>
                  {recentJoins.map((join) => (
                    <motion.div
                      key={join.id}
                      initial={{ opacity: 0, x: 100, scale: 0.5, y: 20 }}
                      animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: -20, x: 50 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                      className="bg-gradient-to-r from-pink-500/90 to-purple-500/90 backdrop-blur-md px-4 py-2 rounded-xl text-white font-bold text-sm shadow-[0_0_20px_rgba(236,72,153,0.6)] border border-white/30 whitespace-nowrap z-50 flex items-center gap-2 relative overflow-hidden"
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/40 to-white/0"
                        animate={{ x: [-100, 100] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        style={{ pointerEvents: "none" }}
                      />
                      <motion.span
                        animate={{ rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 0.5 }}
                        className="inline-block text-lg"
                      >
                        ✨
                      </motion.span>{" "}
                      <span className="relative">{join.name} joined!</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="bg-deep/70 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex-1 flex flex-col rounded-3xl overflow-hidden border-t-4 border-t-purple-500/50">
                <div className="p-4 sm:p-6 border-b border-white/10 cartoon-panel-soft flex justify-between items-center z-10 rounded-t-3xl">
                  <h3 className="text-xl font-black text-white flex items-center gap-3 font-display">
                    Players Grid
                  </h3>
                  <span className="bg-purple-500/20 text-purple-200 text-xs font-bold px-3 py-1 rounded-full border border-purple-500/30">
                    {players.length} Total
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 z-10">
                  {players.length > 0 ? (
                    <motion.div
                      className="flex flex-wrap gap-4 justify-center"
                      layout
                    >
                      <AnimatePresence mode="popLayout">
                        {players.map((p: any, index: number) => (
                          <motion.div
                            layout
                            key={p.user_id || index}
                            initial={{ opacity: 0, scale: 0, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 25,
                            }}
                            className="flex flex-col items-center gap-2 group w-[80px] relative"
                          >
                            {/* Subtle glow ring behind avatar */}
                            <motion.div
                              className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 blur-lg -m-2"
                              animate={{
                                scale: [1, 1.3, 1],
                                opacity: [0.5, 0.8, 0.5],
                              }}
                              transition={{ duration: 2.5, repeat: Infinity }}
                            />
                            <div className="relative">
                              <div
                                className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black shadow-lg border-2 border-white/30 bg-gradient-to-br ${AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]} group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.8)] transition-all relative z-10 overflow-hidden`}
                              >
                                {p.avatar && p.avatar.startsWith("http") ? (
                                  <Image
                                    src={p.avatar}
                                    alt={p.nickname || p.username || "P"}
                                    fill
                                    className="object-cover"
                                    sizes="56px"
                                  />
                                ) : p.avatar ? (
                                  p.avatar
                                ) : (
                                  (p.nickname || p.username || "P")
                                    .charAt(0)
                                    .toUpperCase()
                                )}
                              </div>
                              {/* Animated pulse ring on hover */}
                              <motion.div
                                className="absolute inset-0 rounded-full border-2 border-white/40"
                                animate={{ scale: [1, 1.4], opacity: [1, 0] }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                }}
                                style={{ originX: "center", originY: "center" }}
                              />
                            </div>
                            <div className="font-bold text-white text-xs text-center truncate w-full bg-black/50 px-2 py-1 rounded-lg border border-white/10 group-hover:border-white/30 group-hover:bg-black/70 transition-all shadow-lg">
                              {p.nickname || p.username}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-6 relative overflow-hidden">
                      {/* Subtle floating particles */}
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
                          style={{
                            background: [
                              "rgba(168,85,247,0.35)",
                              "rgba(236,72,153,0.3)",
                              "rgba(34,211,238,0.3)",
                              "rgba(168,85,247,0.25)",
                              "rgba(59,130,246,0.3)",
                              "rgba(236,72,153,0.25)",
                            ][i],
                            left: `${15 + i * 14}%`,
                            top: `${20 + (i % 3) * 25}%`,
                          }}
                          animate={{
                            y: [0, -20, 0],
                            opacity: [0.3, 0.7, 0.3],
                          }}
                          transition={{
                            duration: 3 + i * 0.6,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.5,
                          }}
                        />
                      ))}

                      {/* Soft radial glow behind icon */}
                      <div className="absolute w-40 h-40 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

                      <motion.div
                        animate={{ y: [0, -12, 0] }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center border-2 border-purple-400/40 shadow-[0_0_30px_rgba(168,85,247,0.3)]"
                      >
                        <motion.div
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
                          <Users className="w-10 h-10 text-purple-300" />
                        </motion.div>
                      </motion.div>

                      <div className="text-center mt-4">
                        <h4 className="text-2xl font-black text-white mb-2 font-display">
                          Waiting Room
                        </h4>
                        <p className="text-purple-300/60 font-medium mb-4">
                          No one&apos;s here yet. Start sharing!
                        </p>
                        <motion.div
                          className="flex items-center justify-center gap-1.5"
                          animate={{ opacity: [0.5, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <motion.span
                            className="inline-block w-2 h-2 bg-purple-400 rounded-full"
                            animate={{ y: [0, -8, 0] }}
                            transition={{
                              duration: 1.2,
                              repeat: Infinity,
                              delay: 0,
                            }}
                          />
                          <motion.span
                            className="inline-block w-2 h-2 bg-pink-400 rounded-full"
                            animate={{ y: [0, -8, 0] }}
                            transition={{
                              duration: 1.2,
                              repeat: Infinity,
                              delay: 0.2,
                            }}
                          />
                          <motion.span
                            className="inline-block w-2 h-2 bg-cyan-400 rounded-full"
                            animate={{ y: [0, -8, 0] }}
                            transition={{
                              duration: 1.2,
                              repeat: Infinity,
                              delay: 0.4,
                            }}
                          />
                        </motion.div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ---------------- Render Active Game & Reveal ----------------
  if (
    sessionState === "active" ||
    sessionState === "startCountdown" ||
    sessionState === "leaderboard"
  ) {
    return (
      <div className="relative h-[100dvh] w-full overflow-hidden flex flex-col font-sans">
        <div className="fixed inset-0 z-0 bg-deep pointer-events-none">
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
          <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply z-10" />
        </div>
        <div className="relative z-10 flex-1 w-full flex flex-col text-white min-h-0">
          {/* Top Bar */}
          <header className="cartoon-panel m-2 sm:m-3 p-2.5 sm:p-4 shrink-0 z-10 flex justify-between items-center bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl sm:rounded-3xl">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-red-500/20 text-red-400 p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-red-500/30 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h2 className="text-base sm:text-xl font-black font-display gradient-text-pink-cyan tracking-wide">
                Live Quiz
              </h2>
            </div>

            <div className="flex gap-2 sm:gap-4 items-center">
              <div className="cartoon-panel-soft px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl flex gap-1.5 sm:gap-2 items-center text-sm border-white/10">
                <Users
                  size={16}
                  className="text-cyan-400 sm:[&]:w-[18px] sm:[&]:h-[18px]"
                />
                <span className="font-bold text-white text-base sm:text-lg">
                  {players.length}
                </span>
              </div>
              {totalQuestions > 0 && (
                <div className="cartoon-panel-soft px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl flex gap-1.5 sm:gap-2 items-center text-sm border-white/10">
                  <span className="font-bold text-cyan-300 text-base sm:text-lg tabular-nums">
                    Q.{currentQuestionIndex + 1}
                  </span>
                  <span className="text-white/40 font-bold">/</span>
                  <span className="font-bold text-white/70 text-base sm:text-lg tabular-nums">
                    {totalQuestions}
                  </span>
                </div>
              )}
              {sessionState === "leaderboard" && (
                <div className="flex items-center gap-3">
                  {advanceMode === "auto" && leaderboardCountdown > 0 && (
                    <div className="flex items-center gap-1.5 cartoon-panel-soft px-3 py-1.5 rounded-xl border-white/10">
                      <Clock size={14} className="text-cyan-400" />
                      <span className="text-sm font-bold tabular-nums text-cyan-300">
                        {leaderboardCountdown}s
                      </span>
                    </div>
                  )}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (autoAdvanceRef.current) {
                        clearTimeout(autoAdvanceRef.current);
                        autoAdvanceRef.current = null;
                      }
                      if (leaderboardTimerRef.current) {
                        clearInterval(leaderboardTimerRef.current);
                        leaderboardTimerRef.current = null;
                      }
                      setLeaderboardCountdown(0);
                      handleNextQuestion();
                    }}
                    disabled={isActionLoading}
                    className="btn-cartoon btn-cartoon-blue px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl flex gap-1.5 sm:gap-2 items-center font-black text-sm sm:text-base shadow-[0_0_20px_rgba(59,130,246,0.6)]"
                  >
                    {isActionLoading ? "Loading..." : "Next Question"}{" "}
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              )}
            </div>
          </header>

          {/* ═══ Start Countdown Overlay Modal ═══ */}
          <AnimatePresence>
            {sessionState === "startCountdown" && (
              <motion.div
                key="start-countdown-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-50 flex items-center justify-center"
                style={{
                  background: "rgba(2,6,23,0.85)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ type: "spring", stiffness: 280, damping: 22 }}
                  className="w-full max-w-lg text-center px-4"
                >
                  <motion.div
                    className="relative p-10 md:p-12 rounded-3xl border-2 border-cyan-300/60 bg-slate-950/90"
                    animate={{ scale: 1 + (5 - startupCountdown) * 0.012 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{
                      boxShadow:
                        "0 26px 80px rgba(2,6,23,0.86), inset 0 1px 0 rgba(255,255,255,0.16), 0 0 80px rgba(34,211,238,0.15)",
                    }}
                  >
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70 rounded-t-3xl" />
                    <div className="absolute inset-0 bg-gradient-to-b from-cyan-200/[0.09] to-black/30 rounded-3xl pointer-events-none" />

                    {/* Pulsing clock icon */}
                    <div className="relative w-32 h-32 mx-auto mb-6">
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        animate={{ scale: [1, 1.5, 1.5], opacity: [0.4, 0, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeOut",
                        }}
                        style={{ border: "3px solid rgba(34,211,238,0.5)" }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        animate={{ scale: [1, 1.3, 1.3], opacity: [0.3, 0, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeOut",
                          delay: 0.3,
                        }}
                        style={{ border: "2px solid rgba(34,211,238,0.3)" }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          animate={{
                            scale: [1, 1.08, 1],
                            rotate: [0, 5, 0, -5, 0],
                          }}
                          transition={{ duration: 1.1, repeat: Infinity }}
                          className="w-24 h-24 rounded-full flex items-center justify-center"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(34,211,238,0.34), rgba(59,130,246,0.44))",
                            boxShadow:
                              "0 0 30px rgba(34,211,238,0.28), inset 0 0 20px rgba(255,255,255,0.08)",
                          }}
                        >
                          <Clock className="w-12 h-12 text-white drop-shadow-lg" />
                        </motion.div>
                      </div>
                    </div>

                    {/* Countdown text */}
                    <motion.h2
                      key={startupCountdown}
                      initial={{ scale: 1.4, opacity: 0.6 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.25 }}
                      className="text-5xl md:text-6xl font-black font-display text-white mb-3 relative z-10"
                      style={{
                        textShadow:
                          "0 0 40px rgba(34,211,238,0.5), 0 6px 28px rgba(0,0,0,0.9)",
                      }}
                    >
                      {startupCountdown}
                    </motion.h2>
                    <p className="text-cyan-300 text-xl md:text-2xl font-bold relative z-10 tracking-wide mb-2">
                      Get Ready!
                    </p>
                    <p className="text-cyan-50/70 text-base relative z-10 font-medium">
                      Question {currentQuestionIndex + 1} is about to launch 🚀
                    </p>

                    {/* Progress bar */}
                    <div className="relative z-10 mt-6">
                      <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.16em] text-cyan-50/80 mb-2">
                        <span>Launch Progress</span>
                        <span>{5 - startupCountdown}/5</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-black/55 overflow-hidden border border-cyan-100/30 shadow-[inset_0_0_10px_rgba(0,0,0,0.6)]">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 shadow-[0_0_14px_rgba(56,189,248,0.75)]"
                          animate={{
                            width: `${((5 - startupCountdown) / 5) * 100}%`,
                          }}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <main className="flex-1 flex flex-col lg:flex-row gap-3 p-3 lg:p-4 overflow-hidden max-w-[1920px] mx-auto w-full min-h-0">
            {/* Game Board */}
            <div className="flex-[2.5] flex flex-col relative z-10 min-h-0 overflow-hidden">
              {currentQuestion ? (
                <div className="flex flex-col gap-3 h-full bg-black/40 backdrop-blur-xl rounded-[2rem] border-2 border-white/10 p-5 lg:p-7 shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-y-auto min-h-0">
                  {/* Header / Info with Circular Timer */}
                  <div className="flex justify-between items-center shrink-0">
                    <span className="bg-purple-500/20 text-purple-300 px-4 py-1.5 rounded-full font-black tracking-widest uppercase text-sm border border-purple-500/30 shadow-inner">
                      Q.{currentQuestionIndex + 1}
                    </span>

                    {/* Circular Timer — inline at top */}
                    {(sessionState === "active" ||
                      sessionState === "startCountdown") &&
                      (() => {
                        const hostDuration = currentQuestion.time_limit || 30;
                        const hostTimerVal =
                          sessionState === "startCountdown"
                            ? startupCountdown
                            : timeRemaining;
                        const hostMaxVal =
                          sessionState === "startCountdown" ? 5 : hostDuration;
                        const hostProgress = Math.max(
                          0,
                          Math.min(100, (hostTimerVal / hostMaxVal) * 100),
                        );
                        const ringRadius = 42;
                        const ringCircumference = 2 * Math.PI * ringRadius;
                        const ringOffset =
                          ringCircumference -
                          (hostProgress / 100) * ringCircumference;
                        const tColor =
                          hostProgress > 60
                            ? {
                                stroke: "#22c55e",
                                text: "text-emerald-200",
                                glow: "rgba(34,197,94,0.7)",
                                bg: "border-emerald-400/60",
                              }
                            : hostProgress > 30
                              ? {
                                  stroke: "#eab308",
                                  text: "text-yellow-200",
                                  glow: "rgba(234,179,8,0.7)",
                                  bg: "border-yellow-400/60",
                                }
                              : {
                                  stroke: "#ef4444",
                                  text: "text-red-200",
                                  glow: "rgba(239,68,68,0.9)",
                                  bg: "border-red-400/60",
                                };
                        if (sessionState === "startCountdown") {
                          Object.assign(tColor, {
                            stroke: "#22d3ee",
                            text: "text-cyan-200",
                            glow: "rgba(34,211,238,0.7)",
                            bg: "border-cyan-400/60",
                          });
                        }
                        return (
                          <div
                            className={`relative z-20 w-24 h-24 lg:w-28 lg:h-28 -mt-3 rounded-full border-2 ${tColor.bg} bg-gradient-to-br from-slate-900/93 via-slate-800/88 to-indigo-950/84 backdrop-blur-xl flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.5)]`}
                          >
                            <svg
                              className="absolute inset-0 w-full h-full -rotate-90"
                              viewBox="0 0 100 100"
                            >
                              <circle
                                cx="50"
                                cy="50"
                                r={ringRadius}
                                fill="none"
                                stroke="rgba(255,255,255,0.12)"
                                strokeWidth="8"
                              />
                              <motion.circle
                                cx="50"
                                cy="50"
                                r={ringRadius}
                                fill="none"
                                stroke={tColor.stroke}
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={ringCircumference}
                                animate={{ strokeDashoffset: ringOffset }}
                                transition={{ duration: 0.45, ease: "easeOut" }}
                                style={{
                                  filter: `drop-shadow(0 0 8px ${tColor.glow})`,
                                }}
                              />
                            </svg>
                            <div className="relative z-10 text-center">
                              <motion.div
                                key={hostTimerVal}
                                initial={{ scale: 1.3, opacity: 0.7 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                className={`font-mono text-3xl lg:text-4xl font-black leading-none ${tColor.text}`}
                              >
                                {hostTimerVal}
                              </motion.div>
                              <div className="text-[10px] uppercase tracking-widest text-white/70 font-bold mt-0.5">
                                {sessionState === "startCountdown"
                                  ? "start"
                                  : "sec"}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                        <Zap className="text-amber-400 w-4 h-4 fill-amber-500/40" />
                        <span className="font-bold text-amber-300 text-sm">
                          {currentQuestion.points} pts
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timer Progress Bar */}
                  {(sessionState === "active" ||
                    sessionState === "startCountdown") && (
                    <div className="relative h-2.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/10 shrink-0">
                      <motion.div
                        className={`absolute top-0 left-0 h-full rounded-full ${sessionState === "startCountdown" ? "bg-gradient-to-r from-cyan-500 to-blue-400 shadow-[0_0_15px_rgba(34,211,238,0.6)]" : timeRemaining <= 5 ? "bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_15px_rgba(239,68,68,0.7)]" : "bg-gradient-to-r from-cyan-500 to-purple-500 shadow-[0_0_15px_rgba(34,211,238,0.5)]"}`}
                        animate={{
                          width: `${sessionState === "startCountdown" ? (1 - startupCountdown / 5) * 100 : (1 - timeRemaining / (currentQuestion.time_limit || 30)) * 100}%`,
                        }}
                        transition={{ duration: 1, ease: "linear" }}
                      />
                    </div>
                  )}

                  {/* Question Title */}
                  <div className="flex-1 min-h-0 flex items-center justify-center py-2 lg:py-3 overflow-hidden">
                    <h3
                      className="text-white font-black font-display leading-tight text-center drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)] tracking-tight overflow-hidden"
                      style={{ fontSize: "clamp(1.25rem, 2.8vw, 3rem)", display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                    >
                      {currentQuestion.text}
                    </h3>
                  </div>

                  {/* Options Grid */}
                  <div className="grid gap-2.5 lg:gap-3 grid-cols-2 shrink-0">
                    <AnimatePresence>
                      {currentQuestion.options?.map((opt: any, idx: number) => {
                        const colors = [
                          {
                            gradient: "from-emerald-500/30 to-green-500/20",
                            border: "border-emerald-400/60",
                            chip: "bg-emerald-400 text-emerald-950",
                            glow: "0 4px 20px rgba(16,185,129,0.25)",
                            hoverGlow: "hover:shadow-emerald-500/30",
                          },
                          {
                            gradient: "from-pink-500/30 to-rose-500/20",
                            border: "border-pink-400/60",
                            chip: "bg-pink-400 text-pink-950",
                            glow: "0 4px 20px rgba(236,72,153,0.25)",
                            hoverGlow: "hover:shadow-pink-500/30",
                          },
                          {
                            gradient: "from-amber-500/30 to-orange-500/20",
                            border: "border-amber-400/60",
                            chip: "bg-amber-400 text-amber-950",
                            glow: "0 4px 20px rgba(245,158,11,0.25)",
                            hoverGlow: "hover:shadow-amber-500/30",
                          },
                          {
                            gradient: "from-cyan-500/30 to-blue-500/20",
                            border: "border-cyan-400/60",
                            chip: "bg-cyan-400 text-cyan-950",
                            glow: "0 4px 20px rgba(6,182,212,0.25)",
                            hoverGlow: "hover:shadow-cyan-500/30",
                          },
                          {
                            gradient: "from-violet-500/30 to-indigo-500/20",
                            border: "border-violet-400/60",
                            chip: "bg-violet-400 text-violet-950",
                            glow: "0 4px 20px rgba(139,92,246,0.25)",
                            hoverGlow: "hover:shadow-violet-500/30",
                          },
                          {
                            gradient: "from-fuchsia-500/30 to-pink-500/20",
                            border: "border-fuchsia-400/60",
                            chip: "bg-fuchsia-400 text-fuchsia-950",
                            glow: "0 4px 20px rgba(217,70,239,0.25)",
                            hoverGlow: "hover:shadow-fuchsia-500/30",
                          },
                          {
                            gradient: "from-teal-500/30 to-cyan-500/20",
                            border: "border-teal-400/60",
                            chip: "bg-teal-400 text-teal-950",
                            glow: "0 4px 20px rgba(20,184,166,0.25)",
                            hoverGlow: "hover:shadow-teal-500/30",
                          },
                          {
                            gradient: "from-rose-500/30 to-red-500/20",
                            border: "border-rose-400/60",
                            chip: "bg-rose-400 text-rose-950",
                            glow: "0 4px 20px rgba(244,63,94,0.25)",
                            hoverGlow: "hover:shadow-rose-500/30",
                          },
                        ];
                        const c = colors[idx % 8];

                        // Stat logic
                        const optionCount = answerStats[opt.id] || 0;
                        const percentage =
                          totalAnswers > 0
                            ? Math.round((optionCount / totalAnswers) * 100)
                            : 0;

                        const isReveal = sessionState === "leaderboard";
                        const isCorrect = isReveal && opt.is_correct;
                        const isWrong = isReveal && !opt.is_correct;

                        return (
                          <motion.div
                            initial={{ opacity: 0, y: 12, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                              delay: idx * 0.05,
                              type: "spring",
                              stiffness: 400,
                              damping: 25,
                            }}
                            key={opt.id}
                            style={
                              !isReveal ? { boxShadow: c.glow } : undefined
                            }
                            className={`relative rounded-2xl px-5 py-4 lg:py-5 flex items-center overflow-hidden transition-all duration-400 backdrop-blur-sm ${
                              isCorrect
                                ? "bg-emerald-500/30 border-2 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.6)] scale-[1.02] z-20"
                                : isWrong
                                  ? "bg-gray-800/30 border-2 border-gray-600/40 opacity-50"
                                  : `bg-gradient-to-r ${c.gradient} border-2 ${c.border} ${c.hoverGlow} hover:shadow-lg`
                            }`}
                          >
<div className="flex items-center gap-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center font-black text-base lg:text-xl shrink-0 shadow-md ${isCorrect ? "bg-emerald-400 text-emerald-950" : isWrong ? "bg-gray-600 text-gray-300" : c.chip}`}
                                  >
                                    {String.fromCharCode(65 + idx)}
                                  </div>
                                  <span className="text-lg lg:text-xl xl:text-2xl font-bold text-white drop-shadow-sm leading-tight">
                                  {opt.text}
                                </span>
                              </div>
                            </div>

                            {/* Celebration effects for correct answer */}
                            {isCorrect && (
                              <motion.div
                                className="absolute inset-0 pointer-events-none rounded-xl border-2 border-emerald-300/60"
                                animate={{ opacity: [0, 0.8, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              />
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {sessionState === "active" && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const socket = getSocket();
                        if (socket && currentQuestion?.options) {
                          const correct = currentQuestion.options.find(
                            (o: any) => o.is_correct,
                          );
                          socket.emit("broadcastQuestionEnded", {
                            sessionId: parseInt(sessionId),
                            correctOptionId: correct?.id,
                          });
                        }
                        setSessionState("leaderboard");
                      }}
                      className="mt-4 mx-auto btn-cartoon bg-purple-500/20 hover:bg-purple-500/40 border-2 border-purple-500/50 text-purple-200 px-6 py-1.5 rounded-full font-bold text-sm flex gap-2 items-center"
                    >
                      <Zap size={16} /> Skip Timer
                    </motion.button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-5 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-white/10">
                    <Activity className="w-8 h-8 text-purple-300" />
                  </div>
                  <p className="text-2xl font-black font-display text-white drop-shadow-md">
                    Waiting to push next question...
                  </p>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleNextQuestion}
                    disabled={isActionLoading}
                    className="btn-cartoon btn-cartoon-green px-8 py-4 rounded-2xl font-black text-xl flex gap-3 items-center shadow-[0_0_20px_rgba(34,197,94,0.4)] mt-4"
                  >
                    <Play size={24} fill="currentColor" />{" "}
                    {isActionLoading ? "Loading..." : "Push Question"}
                  </motion.button>
                </div>
              )}
            </div>

            {/* ─── Center Chart Panel (only after question ends) ─── */}
            {sessionState === "leaderboard" && currentQuestion?.options && (() => {
              const neonColors = [
                { gradient: "from-emerald-400 to-emerald-600", glow: "rgba(16,185,129,0.6)", glowStrong: "rgba(16,185,129,0.35)" },
                { gradient: "from-pink-400 to-pink-600", glow: "rgba(236,72,153,0.6)", glowStrong: "rgba(236,72,153,0.35)" },
                { gradient: "from-amber-400 to-amber-600", glow: "rgba(245,158,11,0.6)", glowStrong: "rgba(245,158,11,0.35)" },
                { gradient: "from-cyan-400 to-cyan-600", glow: "rgba(6,182,212,0.6)", glowStrong: "rgba(6,182,212,0.35)" },
                { gradient: "from-violet-400 to-violet-600", glow: "rgba(139,92,246,0.6)", glowStrong: "rgba(139,92,246,0.35)" },
                { gradient: "from-fuchsia-400 to-fuchsia-600", glow: "rgba(217,70,239,0.6)", glowStrong: "rgba(217,70,239,0.35)" },
                { gradient: "from-teal-400 to-teal-600", glow: "rgba(20,184,166,0.6)", glowStrong: "rgba(20,184,166,0.35)" },
                { gradient: "from-rose-400 to-rose-600", glow: "rgba(244,63,94,0.6)", glowStrong: "rgba(244,63,94,0.35)" },
              ];
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-[1] flex flex-col relative z-10 min-h-0 bg-black/40 backdrop-blur-xl rounded-[2rem] border-2 border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden"
                >
                  {/* Grid background */}
                  <div className="absolute inset-0 opacity-[0.07]" style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                  }} />

                  <div className="relative z-10 flex flex-col h-full p-4 lg:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
                        Response Distribution
                      </span>
                      <span className="text-[11px] font-bold text-white/40">
                        {totalAnswers} {totalAnswers === 1 ? "vote" : "votes"}
                      </span>
                    </div>

                    <div className="flex-1 flex items-end justify-center gap-4 lg:gap-6 pb-2">
                      {currentQuestion.options.map((opt: any, idx: number) => {
                        const count = answerStats[opt.id] || 0;
                        const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
                        const isCorrectOpt = opt.is_correct;
                        const nc = isCorrectOpt
                          ? { gradient: "from-emerald-300 to-emerald-500", glow: "rgba(52,211,153,0.8)", glowStrong: "rgba(52,211,153,0.5)" }
                          : neonColors[idx % neonColors.length];
                        const letter = String.fromCharCode(65 + idx);

                        const maxBarHeight = 280;
                        const realHeight = pct > 0 ? Math.max(Math.round((pct / 100) * maxBarHeight), 20) : 10;

                        return (
                          <div key={opt.id} className="flex flex-col items-center gap-1 flex-1 max-w-[90px]">
                            {/* Percentage label on top */}
                            <motion.span
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 + idx * 0.1 }}
                              className={`text-sm lg:text-base font-black tabular-nums mb-1 ${isCorrectOpt ? "text-emerald-300" : "text-white/70"}`}
                              style={{ textShadow: `0 0 10px ${nc.glow}` }}
                            >
                              {pct}%
                            </motion.span>
                            {/* Neon bar */}
                            <div className="w-full flex items-end justify-center" style={{ height: `${maxBarHeight}px` }}>
                              <motion.div
                                className={`w-full max-w-[50px] rounded-xl bg-gradient-to-t ${nc.gradient}`}
                                style={{
                                  boxShadow: `0 0 20px ${nc.glowStrong}, 0 0 40px ${nc.glowStrong}, inset 0 0 20px rgba(255,255,255,0.1)`,
                                }}
                                initial={{ height: 10 }}
                                animate={{ height: realHeight }}
                                transition={{ duration: 0.8, delay: 0.2 + idx * 0.1, ease: "easeOut" }}
                              />
                            </div>
                            {/* Letter label */}
                            <span
                              className={`text-sm font-black mt-2 ${isCorrectOpt ? "text-emerald-300" : "text-white/60"}`}
                              style={{ textShadow: `0 0 8px ${nc.glow}` }}
                            >
                              {letter}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* Leaderboard Sidebar */}
            <div className="flex-1 w-full lg:max-w-xs cartoon-panel flex flex-col overflow-hidden bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl z-10 rounded-2xl sm:rounded-[2rem] min-h-0 max-h-[40vh] lg:max-h-none">
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-b from-white/5 to-transparent">
                <h3 className="text-xl font-black text-white flex items-center gap-2.5 font-display">
                  <span className="text-2xl drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">
                    🏆
                  </span>{" "}
                  Ranks
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <AnimatePresence initial={false}>
                  {leaderboard?.length > 0 ? (
                    leaderboard.map((lb: any, index: number) => {
                      const rankStyles = [
                        {
                          bg: "bg-gradient-to-r from-yellow-500/30 via-amber-500/20 to-yellow-600/25",
                          border: "border-yellow-400/60",
                          shadow: "shadow-[0_0_20px_rgba(234,179,8,0.35)]",
                          leftBar: "bg-gradient-to-b from-yellow-300 to-amber-500 shadow-[0_0_12px_rgba(234,179,8,0.8)]",
                          crown: "👑",
                          scoreColor: "text-yellow-200",
                          nameColor: "text-yellow-50",
                        },
                        {
                          bg: "bg-gradient-to-r from-pink-500/30 via-rose-500/20 to-pink-600/25",
                          border: "border-pink-400/50",
                          shadow: "shadow-[0_0_16px_rgba(236,72,153,0.3)]",
                          leftBar: "bg-gradient-to-b from-pink-300 to-rose-500 shadow-[0_0_10px_rgba(236,72,153,0.7)]",
                          crown: "👑",
                          scoreColor: "text-pink-200",
                          nameColor: "text-pink-50",
                        },
                        {
                          bg: "bg-gradient-to-r from-emerald-500/30 via-green-500/20 to-emerald-600/25",
                          border: "border-emerald-400/50",
                          shadow: "shadow-[0_0_16px_rgba(16,185,129,0.3)]",
                          leftBar: "bg-gradient-to-b from-emerald-300 to-green-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]",
                          crown: "👑",
                          scoreColor: "text-emerald-200",
                          nameColor: "text-emerald-50",
                        },
                      ];
                      const defaultStyle = {
                        bg: "bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-purple-600/15",
                        border: "border-purple-400/25",
                        shadow: "",
                        leftBar: "bg-gradient-to-b from-purple-400 to-indigo-500",
                        crown: "",
                        scoreColor: "text-purple-200",
                        nameColor: "text-white",
                      };
                      const rs = index < 3 ? rankStyles[index] : defaultStyle;

                      return (
                        <motion.div
                          key={lb.participant_id || lb.user_id || `lb-${index}`}
                          layout="position"
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 30,
                            delay: index * 0.04,
                            layout: { type: "spring", stiffness: 300, damping: 30 },
                          }}
                          className={`rounded-xl p-3 flex items-center gap-3 relative overflow-hidden border-2 ${rs.bg} ${rs.border} ${rs.shadow}`}
                        >
                          {/* Left accent bar */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${rs.leftBar}`} />

                          {/* Rank number or crown */}
                          <div className="w-7 text-center shrink-0 ml-1">
                            {index < 3 ? (
                              <span className="text-lg drop-shadow-[0_0_6px_rgba(255,215,0,0.6)]">{rs.crown}</span>
                            ) : (
                              <span className="font-black text-base text-white/40">{index + 1}.</span>
                            )}
                          </div>

                          {/* Avatar */}
                          <div
                            className={`avatar-bubble w-10 h-10 text-base bg-gradient-to-br ${AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]} shadow-inner border-2 ${index < 3 ? rs.border : 'border-white/20'}`}
                          >
                            {lb.avatar && lb.avatar.startsWith("http") ? (
                              <Image
                                src={lb.avatar}
                                alt={lb.nickname || lb.username || "?"}
                                fill
                                className="object-cover rounded-full"
                                sizes="40px"
                              />
                            ) : lb.avatar ? (
                              lb.avatar
                            ) : (
                              (lb.nickname || lb.username)
                                ?.charAt(0)
                                .toUpperCase() || "?"
                            )}
                          </div>

                          {/* Name */}
                          <div className="flex-1 min-w-0">
                            <div className={`font-bold truncate text-sm ${rs.nameColor}`}>
                              {lb.nickname || lb.username}
                            </div>
                          </div>

                          {/* Score */}
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`font-black text-sm tabular-nums ${rs.scoreColor}`}>
                              {lb.score} pts
                            </span>
                            <Zap className={`w-3.5 h-3.5 ${rs.scoreColor} fill-current opacity-70`} />
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-white/40 text-sm gap-4 py-12">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                        <Trophy className="w-6 h-6 text-purple-300" />
                      </div>
                      <p className="font-bold uppercase tracking-widest text-xs">
                        Awaiting Scores
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ---------------- Render Finished State ----------------
  const podiumOrder = leaderboard.slice(0, 3);
  const restPlayers = leaderboard.slice(3);

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
      podiumBg: "from-amber-500/60 via-amber-600/50 to-amber-700/70",
      podiumH: "h-[160px] md:h-[200px]",
      podiumBorder: "border-amber-400/50",
      avatarSize: "w-24 h-24 md:w-28 md:h-28",
      fontSize: "text-3xl md:text-4xl",
      medal: "🥇",
    },
    {
      ring: "ring-slate-300/70",
      gradient: "from-slate-200 via-slate-400 to-slate-600",
      border: "border-slate-300/60",
      glow: "shadow-[0_0_30px_rgba(148,163,184,0.4)]",
      text: "text-slate-300",
      podiumBg: "from-slate-500/50 via-slate-600/45 to-slate-700/60",
      podiumH: "h-[120px] md:h-[150px]",
      podiumBorder: "border-slate-400/40",
      avatarSize: "w-20 h-20 md:w-24 md:h-24",
      fontSize: "text-2xl md:text-3xl",
      medal: "🥈",
    },
    {
      ring: "ring-amber-700/60",
      gradient: "from-amber-600 via-amber-700 to-amber-900",
      border: "border-amber-700/50",
      glow: "shadow-[0_0_25px_rgba(180,83,9,0.35)]",
      text: "text-amber-600",
      podiumBg: "from-amber-700/45 via-amber-800/40 to-amber-900/55",
      podiumH: "h-[90px] md:h-[110px]",
      podiumBorder: "border-amber-700/35",
      avatarSize: "w-18 h-18 md:w-22 md:h-22",
      fontSize: "text-xl md:text-2xl",
      medal: "🥉",
    },
  ];

  // Podium display order: [2nd, 1st, 3rd]
  const podiumDisplay =
    podiumOrder.length >= 2
      ? [
          { data: podiumOrder[1], place: 1 },
          { data: podiumOrder[0], place: 0 },
          ...(podiumOrder[2] ? [{ data: podiumOrder[2], place: 2 }] : []),
        ]
      : podiumOrder.length === 1
        ? [{ data: podiumOrder[0], place: 0 }]
        : [];

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden flex flex-col font-sans">
      <div className="fixed inset-0 z-0 bg-deep pointer-events-none">
        <SpaceBackground />
        {themeImage && (
          <Image
            src={themeImage}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-40 mix-blend-overlay"
            onError={() => setThemeImage("")}
          />
        )}
      </div>

      {/* Confetti particles */}
      <div className="fixed inset-0 z-20 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={`confetti-${i}`}
            className="absolute rounded-sm"
            style={{
              width: 3 + Math.random() * 6,
              height: 3 + Math.random() * 6,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              left: `${5 + Math.random() * 90}%`,
              top: -12,
            }}
            animate={{
              y: [
                0,
                typeof window !== "undefined" ? window.innerHeight + 20 : 900,
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

      <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center px-6 py-8 gap-6 md:gap-8">
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
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-black text-white font-display gradient-text-pink-cyan mb-2 neon-text">
            Quiz Finished!
          </h1>
          <p className="text-purple-200/45 text-sm md:text-lg">
            Here are the final standings
          </p>
        </motion.div>

        {/* ─── 3D Podium ─── */}
        {podiumDisplay.length > 0 && (
          <div className="w-full max-w-2xl" style={{ perspective: "900px" }}>
            {/* Podium stage glow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[70%] h-10 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent blur-xl rounded-full" />

            <div
              className={`flex items-end justify-center ${podiumDisplay.length === 1 ? "gap-0" : "gap-2 md:gap-4"}`}
            >
              {podiumDisplay.map(({ data, place }) => {
                const s = MEDAL_STYLES[place];
                const isFirst = place === 0;
                const entryDelay =
                  place === 0 ? 0.3 : place === 1 ? 0.55 : 0.75;
                const name = data.nickname || data.username || "?";

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
                    className={`flex flex-col items-center ${podiumDisplay.length === 1 ? "" : "flex-1"} ${isFirst ? "max-w-[220px]" : "max-w-[190px]"}`}
                  >
                    {/* Crown for 1st */}
                    {isFirst && (
                      <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="text-3xl md:text-4xl mb-1"
                      >
                        👑
                      </motion.div>
                    )}

                    {/* Avatar */}
                    <motion.div
                      className={`${s.avatarSize} rounded-full bg-gradient-to-br ${s.gradient} flex items-center justify-center ${s.fontSize} font-black text-white border-[3px] ${s.border} ${s.glow} mb-2 relative overflow-hidden`}
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
                        isFirst ? { duration: 2.5, repeat: Infinity } : {}
                      }
                    >
                      {data.avatar && data.avatar.startsWith("http") ? (
                        <Image
                          src={data.avatar}
                          alt={name}
                          fill
                          className="object-cover"
                          sizes="120px"
                        />
                      ) : data.avatar ? (
                        data.avatar
                      ) : (
                        name.charAt(0).toUpperCase()
                      )}
                      {/* Medal badge */}
                      <span className="absolute -bottom-1 -right-1 text-base md:text-lg drop-shadow-lg">
                        {s.medal}
                      </span>
                    </motion.div>

                    {/* Name */}
                    <span className="text-sm md:text-base font-bold text-white/85 truncate max-w-full leading-tight">
                      {name}
                    </span>

                    {/* Score */}
                    <motion.span
                      className={`font-mono font-black text-sm md:text-base ${s.text} mt-0.5`}
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ delay: entryDelay + 0.3, duration: 0.35 }}
                    >
                      {data.score} pts
                    </motion.span>

                    {/* Response time */}
                    {data.totalResponseTime > 0 && (
                      <motion.span
                        className="text-xs md:text-sm font-bold text-purple-300/80 mt-0.5 flex items-center gap-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: entryDelay + 0.5 }}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        {(data.totalResponseTime / 1000).toFixed(1)}s
                      </motion.span>
                    )}

                    {/* 3D Podium block */}
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
                      {/* Inner gradient fill */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-b ${s.podiumBg} opacity-80`}
                      />
                      {/* Top shine */}
                      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                      {/* Side 3D edge */}
                      <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-white/15 to-transparent" />
                      {/* Place number */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          className={`font-black text-white/15 ${isFirst ? "text-6xl md:text-7xl" : "text-5xl md:text-6xl"}`}
                        >
                          {place + 1}
                        </span>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>

            {/* Podium base / floor */}
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
            className="w-full max-w-lg rounded-2xl overflow-hidden backdrop-blur-xl"
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
              {restPlayers.map((lb: any, i: number) => (
                <motion.div
                  key={lb.user_id || lb.nickname || i}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.1 + i * 0.06 }}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white/30 font-mono font-bold text-xs w-6 text-center">
                      {i + 4}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${["from-purple-500 to-indigo-600", "from-pink-500 to-rose-600", "from-cyan-500 to-blue-600", "from-amber-500 to-orange-600", "from-green-500 to-emerald-600"][i % 5]} flex items-center justify-center text-xs font-bold text-white relative overflow-hidden`}
                    >
                      {lb.avatar && lb.avatar.startsWith("http") ? (
                        <Image
                          src={lb.avatar}
                          alt={lb.nickname || lb.username || "?"}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      ) : lb.avatar ? (
                        lb.avatar
                      ) : (
                        (lb.nickname || lb.username || "?")
                          .charAt(0)
                          .toUpperCase()
                      )}
                    </div>
                    <span className="text-sm font-medium text-white/70">
                      {lb.nickname || lb.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-white/40">
                      {lb.score}
                    </span>
                    {lb.totalResponseTime > 0 && (
                      <span className="text-[11px] font-bold text-purple-300/70 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {(lb.totalResponseTime / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── Action button ─── */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => router.replace("/teacher/dashboard")}
          className="btn-cartoon btn-cartoon-pink px-5 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-lg"
        >
          Return to Dashboard
        </motion.button>
      </div>
    </div>
  );
}
