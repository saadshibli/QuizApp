"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  Suspense,
  useRef,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { quizAPI } from "@/lib/api";
import Image from "next/image";
import SpaceBackground from "@/components/SpaceBackground";
import FloatingParticles from "@/components/FloatingParticles";
import { MiniMascot } from "@/components/QuizMascot";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Trash2,
  Plus,
  Clock,
  Star,
  Check,
  CheckCircle2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuthStore } from "@/lib/store/authStore";

interface Question {
  id: string;
  text: string;
  timeLimit: number;
  points: number;
  options: Option[];
}

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizSetup {
  title: string;
  description: string;
  theme: string;
  timeLimit: number;
  points: number;
}

import { THEMES } from "../themes";

const generateId = () => crypto.randomUUID();

const defaultOptions = () => [
  { id: generateId(), text: "", isCorrect: true },
  { id: generateId(), text: "", isCorrect: false },
  { id: generateId(), text: "", isCorrect: false },
  { id: generateId(), text: "", isCorrect: false },
];

function BuilderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizIdParam = searchParams.get("quizId");
  const { user, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user || (user.role !== "teacher" && user.role !== "admin")) {
      router.replace("/login");
    }
  }, [user, _hasHydrated, router]);

  const [saving, setSaving] = useState(false);
  const [setup, setSetup] = useState<QuizSetup | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [originalQuestionIds, setOriginalQuestionIds] = useState<number[]>([]);
  const initializedRef = useRef(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false);
  const [feedbackPulseKey, setFeedbackPulseKey] = useState(0);
  const [validationModal, setValidationModal] = useState<string | null>(null);

  const loadExistingQuiz = useCallback(
    async (id: string) => {
      try {
        const res = await quizAPI.getQuiz(id);
        const q = res.data;
        setSetup({
          title: q.title,
          description: q.description || "",
          theme: q.theme || "none",
          timeLimit: 30,
          points: 100,
        });
        const loadedQuestions = q.questions.map((qq: any) => {
          const opts = (qq.options || []).map((o: any) => ({
            id: generateId(),
            text: o.option_text,
            isCorrect: o.is_correct,
          }));
          while (opts.length < 4) {
            opts.push({ id: generateId(), text: "", isCorrect: false });
          }
          return {
            id: generateId(),
            text: qq.question_text,
            timeLimit: qq.time_limit || 30,
            points: qq.points || 100,
            options: opts,
          };
        });
        setOriginalQuestionIds(q.questions.map((qq: any) => qq.id));
        setQuestions(
          loadedQuestions.length > 0
            ? loadedQuestions
            : [
                {
                  id: generateId(),
                  text: "",
                  timeLimit: 30,
                  points: 100,
                  options: defaultOptions(),
                },
              ],
        );
      } catch (err) {
        console.error(err);
        toast.error("Failed to load quiz");
        router.replace("/teacher/dashboard");
      }
    },
    [router],
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (quizIdParam) {
      loadExistingQuiz(quizIdParam);
    } else {
      const savedSetup = window.localStorage.getItem("quizSetup");
      if (!savedSetup) {
        router.replace("/create-quiz");
        return;
      }
      try {
        const parsed = JSON.parse(savedSetup);
        setSetup(parsed);
        setQuestions([
          {
            id: generateId(),
            text: "",
            timeLimit: parsed.timeLimit || 30,
            points: parsed.points || 100,
            options: defaultOptions(),
          },
        ]);
      } catch (err) {
        router.replace("/create-quiz");
      }
    }
  }, [router, quizIdParam, loadExistingQuiz]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  if (!setup) return null;

  const currentTheme = THEMES[setup.theme] || THEMES.none;
  const currentQuestion = questions[currentIndex] || questions[0];
  const correctOptionIndex = (currentQuestion?.options || []).findIndex(
    (opt) => opt.isCorrect,
  );
  const correctOptionLabel =
    correctOptionIndex >= 0
      ? `Option ${String.fromCharCode(65 + correctOptionIndex)}`
      : "Not selected";

  const handleUpdateQuestion = (updates: Partial<Question>) => {
    const updated = [...questions];
    updated[currentIndex] = { ...updated[currentIndex], ...updates };
    setQuestions(updated);
  };

  const handleUpdateOption = (optId: string, text: string) => {
    const updatedOpts = currentQuestion.options.map((opt) =>
      opt.id === optId ? { ...opt, text } : opt,
    );
    handleUpdateQuestion({ options: updatedOpts });
  };

  const handleSetCorrectOption = (optId: string) => {
    const updatedOpts = currentQuestion.options.map((opt) => ({
      ...opt,
      isCorrect: opt.id === optId,
    }));
    handleUpdateQuestion({ options: updatedOpts });

    setFeedbackPulseKey((prev) => prev + 1);
    setShowCorrectFeedback(true);
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = setTimeout(() => {
      setShowCorrectFeedback(false);
    }, 1400);
  };

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: generateId(),
      text: "",
      timeLimit: setup.timeLimit,
      points: setup.points,
      options: defaultOptions(),
    };
    setQuestions([...questions, newQ]);
    setCurrentIndex(questions.length);
  };

  const handleDeleteQuestion = () => {
    if (questions.length <= 1) {
      setValidationModal("You need at least one question!");
      return;
    }
    const updated = questions.filter((_, idx) => idx !== currentIndex);
    setQuestions(updated);
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const handleSaveAndContinue = async () => {
    const isValid = questions.every(
      (q) =>
        q.text.trim().length >= 1 &&
        q.options.some((o) => o.isCorrect) &&
        q.options.filter((o) => o.text.trim().length > 0).length >= 2,
    );

    if (!isValid) {
      setValidationModal(
        "Please complete all questions. Ensure each has text, at least 2 options, and 1 correct answer.",
      );
      return;
    }

    const saveId = toast.loading(
      quizIdParam ? "Updating Quiz..." : "Saving Quiz...",
    );
    setSaving(true);
    try {
      const quizData = {
        title: setup?.title || "Untitled",
        description: setup?.description || "",
        theme: setup?.theme || "none",
      };

      let targetQuizId = quizIdParam;

      if (quizIdParam) {
        await quizAPI.updateQuiz(quizIdParam, quizData);
        for (const oldQuestionId of originalQuestionIds) {
          try {
            await quizAPI.deleteQuestion(oldQuestionId);
          } catch (ee: any) {
            console.error("DELETE ERROR:", ee?.response?.data || ee);
          }
        }
      } else {
        const quizRes = await quizAPI.createQuiz(quizData);
        targetQuizId = quizRes.data.id;
      }

      for (const q of questions) {
        if (q.text.trim() === "") continue;
        const resQ = await quizAPI.addQuestion(targetQuizId!, {
          question_text: q.text,
          time_limit: q.timeLimit,
          points: q.points,
        });
        const createdQ = resQ.data;
        const validOptions = q.options.filter((o) => o.text.trim() !== "");
        for (const o of validOptions) {
          await quizAPI.addOption(createdQ.id, {
            option_text: o.text,
            is_correct: o.isCorrect,
          });
        }
      }

      toast.success(
        quizIdParam
          ? "Quiz updated successfully!"
          : "Quiz created successfully!",
        { id: saveId },
      );
      router.push("/teacher/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save quiz", {
        id: saveId,
      });
    } finally {
      setSaving(false);
    }
  };

  const optionThemes = [
    {
      shell: "from-emerald-500/30 to-green-500/20",
      shellHover: "hover:shadow-emerald-500/25",
      active: "ring-2 ring-emerald-300/60 shadow-emerald-500/35",
      text: "text-emerald-100",
      badge: "bg-emerald-400 text-emerald-950",
      input: "placeholder:text-emerald-100/45",
    },
    {
      shell: "from-pink-500/30 to-rose-500/20",
      shellHover: "hover:shadow-pink-500/25",
      active: "ring-2 ring-pink-300/60 shadow-pink-500/35",
      text: "text-pink-100",
      badge: "bg-pink-400 text-pink-950",
      input: "placeholder:text-pink-100/45",
    },
    {
      shell: "from-amber-500/30 to-orange-500/20",
      shellHover: "hover:shadow-amber-500/25",
      active: "ring-2 ring-amber-300/60 shadow-amber-500/35",
      text: "text-amber-100",
      badge: "bg-amber-400 text-amber-950",
      input: "placeholder:text-amber-100/45",
    },
    {
      shell: "from-cyan-500/30 to-blue-500/20",
      shellHover: "hover:shadow-cyan-500/25",
      active: "ring-2 ring-cyan-300/60 shadow-cyan-500/35",
      text: "text-cyan-100",
      badge: "bg-cyan-400 text-cyan-950",
      input: "placeholder:text-cyan-100/45",
    },
    {
      shell: "from-violet-500/30 to-indigo-500/20",
      shellHover: "hover:shadow-violet-500/25",
      active: "ring-2 ring-violet-300/60 shadow-violet-500/35",
      text: "text-violet-100",
      badge: "bg-violet-400 text-violet-950",
      input: "placeholder:text-violet-100/45",
    },
    {
      shell: "from-fuchsia-500/30 to-pink-500/20",
      shellHover: "hover:shadow-fuchsia-500/25",
      active: "ring-2 ring-fuchsia-300/60 shadow-fuchsia-500/35",
      text: "text-fuchsia-100",
      badge: "bg-fuchsia-400 text-fuchsia-950",
      input: "placeholder:text-fuchsia-100/45",
    },
    {
      shell: "from-teal-500/30 to-cyan-500/20",
      shellHover: "hover:shadow-teal-500/25",
      active: "ring-2 ring-teal-300/60 shadow-teal-500/35",
      text: "text-teal-100",
      badge: "bg-teal-400 text-teal-950",
      input: "placeholder:text-teal-100/45",
    },
    {
      shell: "from-rose-500/30 to-red-500/20",
      shellHover: "hover:shadow-rose-500/25",
      active: "ring-2 ring-rose-300/60 shadow-rose-500/35",
      text: "text-rose-100",
      badge: "bg-rose-400 text-rose-950",
      input: "placeholder:text-rose-100/45",
    },
  ];

  return (
    <div className="relative min-h-[100dvh] h-[100dvh] w-full overflow-hidden flex flex-col font-sans">
      {/* Validation Modal */}
      <AnimatePresence>
        {validationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setValidationModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 26 }}
              className="relative mx-4 w-full max-w-md rounded-2xl border border-red-300/30 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 border border-red-400/40">
                  <svg
                    className="h-5 w-5 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Validation Error
                </h3>
              </div>
              <p className="mb-6 text-sm leading-relaxed text-slate-300">
                {validationModal}
              </p>
              <button
                type="button"
                onClick={() => setValidationModal(null)}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:shadow-cyan-500/25 hover:brightness-110"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background */}
      <div className="absolute inset-0 z-0 bg-deep">
        <SpaceBackground />
        <FloatingParticles variant="quiz" />
        {currentTheme.image && (
          <Image
            src={currentTheme.image}
            alt={currentTheme.name}
            fill
            className="absolute inset-0 object-cover opacity-70 z-0"
            unoptimized
          />
        )}
        <motion.div
          className="absolute inset-0 z-[9] opacity-55"
          style={{
            background:
              "linear-gradient(120deg, rgba(14,165,233,0.22), rgba(16,185,129,0.18), rgba(244,63,94,0.2), rgba(234,179,8,0.16))",
            backgroundSize: "240% 240%",
          }}
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/70 z-10" />
      </div>

      {/* ═══ Top Navbar ═══ */}
      <header className="relative z-20 flex-shrink-0 bg-slate-950/95 border-b border-slate-700/70 px-4 lg:px-6 py-3 flex items-center justify-between shadow-[0_10px_30px_rgba(2,6,23,0.45)]">
        <div className="flex items-center gap-4">
          <button
            type="button"
            title="Go Back"
            onClick={() => router.back()}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/70 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold leading-none">
              {setup.title || "Untitled Quiz"}
            </h1>
            <div className="text-white/40 text-xs flex items-center gap-2 mt-0.5">
              <span>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span>•</span>
              <span className="uppercase tracking-wider text-purple-300/60">
                {currentTheme.name}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-600">
            <MiniMascot size={34} />
            <span className="text-xs font-bold text-cyan-200 whitespace-nowrap">
              Build Mode
            </span>
          </div>
        </div>
      </header>

      {/* ═══ Main Content ═══ */}
      <main className="isolate relative z-10 flex-1 overflow-hidden flex flex-col w-full max-w-6xl mx-auto px-4 lg:px-6 py-3 gap-3">
        {/* ─── Control Bar: Tabs + Time/Points + Delete ─── */}
        <div className="flex items-center gap-3 flex-wrap shrink-0 bg-slate-900/92 border border-slate-700/70 rounded-2xl px-4 py-2.5 shadow-[0_10px_24px_rgba(2,6,23,0.35)]">
          {/* Question navigation pills */}
          <div className="flex items-center gap-2">
            {questions.map((q, idx) => (
              <motion.button
                type="button"
                key={q.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentIndex(idx)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  currentIndex === idx
                    ? "bg-sky-300 text-slate-950 shadow-[0_8px_18px_rgba(125,211,252,0.35)]"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-600"
                }`}
              >
                Q{idx + 1}
              </motion.button>
            ))}
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddQuestion}
              className="flex-shrink-0 px-4 py-2 rounded-xl border-2 border-dashed border-slate-500 bg-slate-800/70 hover:bg-slate-700 transition-all font-bold text-sm text-slate-300 hover:text-white flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> New
            </motion.button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Time + Points + Delete Controls */}
          <div className="flex items-center gap-3">
            {/* Time Control */}
            <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2.5 border border-slate-600 min-w-[190px] shadow-[inset_0_0_0_1px_rgba(148,163,184,0.08)]">
              <Clock className="w-4.5 h-4.5 text-cyan-300 shrink-0" />
              <span className="text-sm font-bold text-white/85 whitespace-nowrap">
                Time:
              </span>
              <input
                type="number"
                min={1}
                max={120}
                aria-label="Time limit in seconds"
                value={currentQuestion?.timeLimit ?? 30}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    handleUpdateQuestion({
                      timeLimit: Math.min(120, Math.max(1, val)),
                    });
                  } else if (e.target.value === "") {
                    handleUpdateQuestion({ timeLimit: 1 });
                  }
                }}
                className="w-12 bg-slate-700/60 border border-slate-600 rounded-lg px-1.5 py-0.5 text-center text-sm font-semibold text-white outline-none focus:border-cyan-400/60 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-sm font-semibold text-white/70">s</span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateQuestion({
                      timeLimit: Math.max(
                        1,
                        (currentQuestion?.timeLimit || 30) - 1,
                      ),
                    })
                  }
                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-colors"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateQuestion({
                      timeLimit: Math.min(
                        120,
                        (currentQuestion?.timeLimit || 30) + 1,
                      ),
                    })
                  }
                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Points Control */}
            <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2.5 border border-slate-600 min-w-[210px] shadow-[inset_0_0_0_1px_rgba(148,163,184,0.08)]">
              <Star className="w-4.5 h-4.5 text-amber-300 shrink-0" />
              <span className="text-sm font-bold text-white/85 whitespace-nowrap">
                Points:
              </span>
              <input
                type="number"
                min={1}
                max={2000}
                aria-label="Points per question"
                value={currentQuestion?.points ?? 100}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    handleUpdateQuestion({
                      points: Math.min(2000, Math.max(1, val)),
                    });
                  } else if (e.target.value === "") {
                    handleUpdateQuestion({ points: 1 });
                  }
                }}
                className="w-16 bg-slate-700/60 border border-slate-600 rounded-lg px-1.5 py-0.5 text-center text-sm font-semibold text-white outline-none focus:border-amber-400/60 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateQuestion({
                      points: Math.max(1, (currentQuestion?.points || 100) - 1),
                    })
                  }
                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-colors"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateQuestion({
                      points: Math.min(
                        2000,
                        (currentQuestion?.points || 100) + 1,
                      ),
                    })
                  }
                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Delete Button */}
            {questions.length > 1 && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleDeleteQuestion}
                className="p-2 rounded-xl bg-red-900/35 hover:bg-red-900/55 text-red-300 hover:text-red-200 border border-red-700/70 transition-all"
                title="Delete Question"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>

        {/* ─── Unified Content Panel ─── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto hide-scrollbar pb-32 isolate [will-change:transform] [backface-visibility:hidden]">
          <div className="shrink-0 flex flex-col gap-5 rounded-3xl p-6 lg:p-7 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700/70 shadow-[0_20px_46px_rgba(2,6,23,0.5)] group transition-colors">
            <div className="flex flex-col gap-6">
              {/* Question Text Input */}
              <div>
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <label className="text-sm font-bold uppercase tracking-[0.15em] text-slate-200">
                    Question
                  </label>
                  <span className="text-sm text-slate-300 font-medium">
                    {(currentQuestion?.text || "").length} / 300
                  </span>
                </div>

                <textarea
                  value={currentQuestion?.text || ""}
                  onChange={(e) =>
                    handleUpdateQuestion({ text: e.target.value })
                  }
                  placeholder="Type your quiz question here..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-600 rounded-2xl px-5 py-4 text-white text-2xl md:text-3xl font-black placeholder:text-slate-500 resize-none outline-none focus:outline-none focus-visible:outline-none focus:border-slate-600 focus-visible:border-slate-600 focus:ring-0 focus-visible:ring-0 focus:shadow-none focus-visible:shadow-none transition-colors leading-snug"
                />
              </div>

              {/* Answer Options Grid */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                    Answer Options
                  </div>
                  <AnimatePresence mode="wait">
                    {showCorrectFeedback && (
                      <motion.div
                        key={`correct-feedback-${feedbackPulseKey}`}
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        className="text-xs sm:text-sm font-bold text-emerald-100 bg-emerald-500/20 border border-emerald-300/40 rounded-full px-3 py-1 shadow-[0_0_18px_rgba(52,211,153,0.35)] whitespace-nowrap"
                      >
                        Correct Answer Selected!
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(currentQuestion?.options || []).map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const theme = optionThemes[idx % optionThemes.length];

                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSetCorrectOption(opt.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSetCorrectOption(opt.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className={`group/option relative flex items-center gap-3 min-h-[78px] px-3 py-2.5 rounded-xl transition-colors duration-200 cursor-pointer ${
                          opt.isCorrect
                            ? `bg-gradient-to-br ${theme.shell} ${theme.active} border border-slate-200/25 shadow-[0_10px_22px_rgba(14,165,233,0.18)]`
                            : `bg-gradient-to-br ${theme.shell} ${theme.shellHover} border border-slate-400/20 shadow-[0_8px_18px_rgba(2,6,23,0.34)]`
                        }`}
                      >
                        {currentQuestion!.options.length > 2 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newOpts = currentQuestion!.options.filter(
                                (o) => o.id !== opt.id,
                              );
                              if (opt.isCorrect && newOpts.length > 0)
                                newOpts[0].isCorrect = true;
                              handleUpdateQuestion({ options: newOpts });
                            }}
                            className="absolute top-1.5 right-1.5 p-1 rounded-md text-slate-300/60 hover:text-red-300 hover:bg-red-900/25 transition-all opacity-45 hover:opacity-100"
                            title="Remove Option"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${
                            opt.isCorrect
                              ? "bg-emerald-300 text-emerald-950"
                              : "bg-slate-200/85 text-slate-900"
                          }`}
                        >
                          {letter}
                        </div>

                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) =>
                            handleUpdateOption(opt.id, e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          placeholder={`Option ${letter}...`}
                          className={`flex-1 pr-2 bg-transparent border-none outline-none text-lg md:text-xl font-extrabold placeholder:font-semibold leading-tight ${
                            opt.isCorrect
                              ? "text-emerald-50 placeholder:text-emerald-100/45"
                              : "text-slate-100 placeholder:text-slate-400"
                          }`}
                        />

                        {opt.isCorrect && (
                          <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-gradient-to-b from-lime-300 to-emerald-500 border border-emerald-100/80 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_0_12px_rgba(34,197,94,0.45)] pointer-events-none">
                            <Check className="w-4 h-4 text-white stroke-[3] drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add Option Button */}
                  {(currentQuestion?.options.length || 0) < 8 && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (!currentQuestion) return;
                        const newOpt = {
                          id: generateId(),
                          text: "",
                          isCorrect: false,
                        };
                        handleUpdateQuestion({
                          options: [...currentQuestion.options, newOpt],
                        });
                      }}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-600 bg-slate-800 hover:bg-slate-700 hover:border-slate-400 text-white transition-all font-semibold text-sm shadow-[0_8px_20px_rgba(2,6,23,0.35)]"
                    >
                      <Plus className="w-4 h-4" />
                      Add Option
                    </motion.button>
                  )}

                  <div className="lg:col-span-2 rounded-2xl px-4 py-3 bg-slate-800/90 border border-slate-600 text-white shadow-[inset_0_0_14px_rgba(148,163,184,0.08)]">
                    <div className="flex items-center justify-between gap-3 overflow-x-auto whitespace-nowrap">
                      <div className="flex items-center gap-2 text-base font-semibold shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                        <span className="text-slate-200">Correct Answer:</span>
                        <span className="text-emerald-300 font-bold">
                          {correctOptionLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {(currentQuestion?.options || []).map((opt, idx) => {
                          const letter = String.fromCharCode(65 + idx);
                          return (
                            <button
                              key={`correct-picker-${opt.id}`}
                              type="button"
                              onClick={() => handleSetCorrectOption(opt.id)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                opt.isCorrect
                                  ? "bg-emerald-500/25 border-emerald-300/60 text-emerald-100 shadow-[0_0_12px_rgba(52,211,153,0.25)]"
                                  : "bg-slate-700/70 border-slate-500 text-slate-200 hover:bg-slate-600"
                              }`}
                            >
                              {letter}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Bottom Navigation Bar ─── */}
        <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none pt-8 pb-4 px-3 sm:px-4 lg:px-6">
          <div className="pointer-events-auto bg-gradient-to-t from-slate-950 via-slate-950/96 to-transparent rounded-t-2xl">
            <div className="w-full">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl bg-slate-900/95 border border-slate-700/70 px-3 sm:px-4 py-3 shadow-[0_12px_28px_rgba(2,6,23,0.45)]">
                <div className="flex items-center justify-start gap-2">
                  <motion.button
                    type="button"
                    whileHover={{ x: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      setCurrentIndex(Math.max(0, currentIndex - 1))
                    }
                    disabled={currentIndex === 0}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </motion.button>
                </div>

                <div className="flex items-center justify-center">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSaveAndContinue}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 sm:px-8 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold border border-emerald-300/50 shadow-[0_12px_26px_rgba(16,185,129,0.35)] disabled:opacity-50 transition-all"
                  >
                    <Save
                      className={`w-4 h-4 ${saving ? "animate-spin" : ""}`}
                    />
                    <span className="whitespace-nowrap">
                      {saving
                        ? "Saving..."
                        : quizIdParam
                          ? "Save Changes"
                          : "Publish Quiz"}
                    </span>
                  </motion.button>
                </div>

                <div className="flex items-center justify-end gap-2">
                  {currentIndex < questions.length - 1 && (
                    <motion.button
                      type="button"
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentIndex(currentIndex + 1)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 text-slate-200 font-semibold border border-slate-600 hover:bg-slate-700 transition-all"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  )}

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleAddQuestion}
                    className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-extrabold border border-sky-300/50 shadow-[0_12px_26px_rgba(14,165,233,0.35)]"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="whitespace-nowrap">New Question</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-deep text-white flex items-center justify-center">
          <div className="waiting-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      }
    >
      <BuilderPageContent />
    </Suspense>
  );
}
