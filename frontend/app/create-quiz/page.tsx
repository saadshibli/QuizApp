"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { THEMES } from "./themes";
import Link from "next/link";
import {
  ArrowLeft,
  Palette,
  Type,
  AlignLeft,
  Settings,
  Clock,
  Star,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import SpaceBackground from "@/components/SpaceBackground";
import { useAuthStore } from "@/lib/store/authStore";

export default function QuizSetupPage() {
  const router = useRouter();
  const themeScrollRef = useRef<HTMLDivElement>(null);
  const { user, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user || (user.role !== "teacher" && user.role !== "admin")) {
      router.push("/login");
    }
  }, [user, _hasHydrated, router]);

  // Settings State
  const [activeThemeId, setActiveThemeId] = useState<string>("none");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState("5");
  const [points, setPoints] = useState("5");

  const currentTheme = THEMES[activeThemeId] || THEMES.none;

  const handleContinue = () => {
    const payload = {
      title,
      description,
      theme: activeThemeId,
      timeLimit: parseInt(timeLimit, 10) || 5,
      points: parseInt(points, 10) || 5,
    };
    if (typeof window !== "undefined") {
      window.localStorage.setItem("quizSetup", JSON.stringify(payload));
    }
    router.push(`/create-quiz/builder`);
  };

  const scrollThemes = (direction: "left" | "right") => {
    if (themeScrollRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      themeScrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="space-bg h-[100dvh] max-h-[100dvh] w-full relative overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 z-0 bg-[#0f0028]">
        <SpaceBackground />
      </div>

      <div className="absolute top-0 left-0 w-full p-4 sm:p-6 z-20 flex justify-between items-center pointer-events-none">
        <Link href="/teacher/dashboard" className="pointer-events-auto">
          <motion.div
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            className="btn-cartoon btn-cartoon-outline px-4 py-2 flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white rounded-2xl shadow-lg hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold hidden sm:inline">Back</span>
          </motion.div>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
        className={`relative z-10 w-full max-w-4xl max-h-[95dvh] flex flex-col gap-3 p-4 sm:p-6 rounded-3xl backdrop-blur-xl border overflow-hidden ${currentTheme.borderClass} ${currentTheme.glowClass} ${currentTheme.cardClass}`}
      >
        {/* Card Background */}
        <AnimatePresence mode="popLayout">
          {activeThemeId !== "none" && (
            <motion.div
              key={currentTheme.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 z-0 bg-slate-900"
            >
              <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply z-10" />
              {currentTheme.image && (
                <Image
                  src={currentTheme.image}
                  alt={currentTheme.name}
                  fill
                  className="absolute inset-0 object-cover opacity-80 z-0"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 text-center shrink-0 mb-1">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              delay: 0.2,
            }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs sm:text-sm font-bold tracking-wider uppercase mb-1 sm:mb-2 shadow-inner"
          >
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${activeThemeId === "none" ? "bg-white" : "bg-purple-400"}`}
            />
            Step 1 of 3: Quiz Setup
          </motion.div>
          <h1 className="text-3xl sm:text-5xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)] flex items-center justify-center gap-3">
            <Palette
              className={`w-8 h-8 sm:w-12 sm:h-12 hidden sm:block ${currentTheme.accentText}`}
            />
            Quiz Theme
          </h1>
          <p className="text-white/60 text-xs sm:text-sm font-bold mt-1 px-4">
            Give your quiz a name and pick a visual style that players will see!
          </p>
        </div>

        {/* Removed flex-1 and overflow-y-auto so the card naturally limits itself to the content */}
        <div className="relative z-10 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="cartoon-panel-soft bg-black/40 backdrop-blur-md rounded-2xl p-2 sm:p-3 border border-white/10 group hover:bg-black/50 hover:border-white/30 transition-all duration-300 shadow-xl">
              <label
                htmlFor="title"
                className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1 sm:mb-2 ${currentTheme.accentText}`}
              >
                <Type className="w-4 h-4" /> Title
              </label>
              <input
                id="title"
                type="text"
                placeholder="Awesome Quiz"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                className="w-full bg-black/20 border-2 border-white/10 rounded-xl px-3 py-2 sm:py-2.5 text-white placeholder:text-white/50 font-bold focus:outline-none focus:border-white/40 transition-all text-sm sm:text-base shadow-inner group-hover:bg-black/30"
              />
            </div>

            <div className="cartoon-panel-soft bg-black/40 backdrop-blur-md rounded-2xl p-2 sm:p-3 border border-white/10 group hover:bg-black/50 hover:border-white/30 transition-all duration-300 shadow-xl">
              <label
                htmlFor="description"
                className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1 sm:mb-2 ${currentTheme.accentText}`}
              >
                <AlignLeft className="w-4 h-4" /> Description{" "}
                <span className="text-white/60 font-normal">(Optional)</span>
              </label>
              <input
                id="description"
                type="text"
                placeholder="What's this quiz about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-black/20 border-2 border-white/10 rounded-xl px-3 py-2 sm:py-2.5 text-white placeholder:text-white/50 font-bold focus:outline-none focus:border-white/40 transition-all text-sm sm:text-base shadow-inner group-hover:bg-black/30"
              />
            </div>
          </div>

          <div className="cartoon-panel-soft bg-black/40 backdrop-blur-md rounded-2xl p-2 sm:p-4 border border-white/10 group hover:bg-black/50 hover:border-white/30 transition-all duration-300 relative shadow-xl">
            <div
              className={`flex items-center justify-between text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2 ${currentTheme.accentText}`}
            >
              <div className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/50" />{" "}
                Choose Gameplay Theme
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-black/40 px-2.5 py-1 rounded-lg text-white/70 text-[10px] border border-white/10 hidden sm:inline-block">
                  {Object.keys(THEMES).length} Themes
                </span>
              </div>
            </div>

            {/* Added padding and negative margin to completely avoid cropping */}
            <div className="relative -my-6 py-6 -mx-2 px-2 group/slider">
              <button
                type="button"
                title="Scroll Left"
                onClick={() => scrollThemes("left")}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 rounded-full text-white transition-all active:scale-95 opacity-0 group-hover/slider:opacity-100 sm:flex items-center justify-center hidden shadow-xl"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                title="Scroll Right"
                onClick={() => scrollThemes("right")}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 rounded-full text-white transition-all active:scale-95 opacity-0 group-hover/slider:opacity-100 sm:flex items-center justify-center hidden shadow-xl"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div
                ref={themeScrollRef}
                className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory hide-scrollbar pt-2 pb-4 px-2"
              >
                {Object.values(THEMES).map((theme) => {
                  const isSelected = activeThemeId === theme.id;
                  return (
                    <motion.button
                      type="button"
                      key={theme.id}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveThemeId(theme.id)}
                      className={`snap-center shrink-0 w-24 sm:w-36 h-28 sm:h-36 rounded-2xl relative overflow-hidden flex flex-col border-4 transition-all duration-300 ${isSelected ? "border-white ring-4 ring-purple-500/50 shadow-[0_0_20px_rgba(255,255,255,0.4)]" : "border-transparent hover:border-white/30 saturate-50 hover:saturate-100"} ${theme.cardClass}`}
                    >
                      <div className="absolute inset-0 z-0">
                        {theme.image ? (
                          <Image
                            src={theme.image}
                            alt={theme.name}
                            fill
                            className="object-cover opacity-60 mix-blend-screen"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#1a0b2e] to-[#0f0028] opacity-80" />
                        )}
                      </div>
                      <div
                        className={`absolute inset-0 bg-gradient-to-t ${isSelected ? "from-purple-900/90" : "from-black/90"} to-transparent z-10`}
                      />
                      <div className="relative z-20 flex-1 flex flex-col items-center justify-end pb-3 sm:pb-4 p-2">
                        <span
                          className={`text-xs sm:text-sm font-black text-center ${isSelected ? "text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" : "text-white/60"}`}
                        >
                          {theme.name}
                        </span>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 right-2 bg-white text-purple-600 rounded-full p-1 shadow-lg"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              className="w-3 h-3 sm:w-4 sm:h-4"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="cartoon-panel-soft bg-black/40 backdrop-blur-md rounded-2xl p-2 sm:p-4 border border-white/10 group hover:bg-black/50 hover:border-white/30 transition-all duration-300 shadow-xl">
            <label
              className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2 ${currentTheme.accentText}`}
            >
              <Settings className="w-4 h-4 text-white/50" /> Default Question
              Elements
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="cartoon-panel-soft bg-black/40 rounded-xl p-2 sm:p-3 border border-white/10 flex items-center justify-between group hover:bg-black/50 hover:border-white/30 transition-colors duration-300 relative overflow-hidden">
                <div className="relative z-10">
                  <label
                    className={`flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-0.5 ${currentTheme.accentText}`}
                  >
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Time Limit
                  </label>
                  <p className="text-white/60 text-[10px] sm:text-xs font-bold">
                    Seconds per Question
                  </p>
                </div>
                <div className="relative z-10 bg-black/30 p-1 sm:p-1.5 rounded-xl border border-white/20 shadow-inner group-hover:border-white/40 transition-colors flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    title="Decrease Time Limit"
                    onClick={() =>
                      setTimeLimit((prev) =>
                        Math.max(1, (parseInt(prev) || 5) - 1).toString(),
                      )
                    }
                    className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Time limit in seconds"
                    value={timeLimit}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "");
                      if (v === "") {
                        setTimeLimit("");
                        return;
                      }
                      const n = Math.min(120, Math.max(1, parseInt(v)));
                      setTimeLimit(n.toString());
                    }}
                    onBlur={() => {
                      if (!timeLimit || parseInt(timeLimit) < 1)
                        setTimeLimit("5");
                    }}
                    className="w-10 sm:w-14 text-center text-base sm:text-xl text-white font-bold bg-transparent outline-none"
                  />
                  <button
                    type="button"
                    title="Increase Time Limit"
                    onClick={() =>
                      setTimeLimit((prev) =>
                        Math.min(120, (parseInt(prev) || 0) + 1).toString(),
                      )
                    }
                    className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="cartoon-panel-soft bg-black/40 rounded-xl p-2 sm:p-3 border border-white/10 flex items-center justify-between group hover:bg-black/50 hover:border-white/30 transition-colors duration-300 relative overflow-hidden">
                <div className="relative z-10">
                  <label
                    className={`flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-0.5 ${currentTheme.accentText}`}
                  >
                    <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Points
                  </label>
                  <p className="text-white/60 text-[10px] sm:text-xs font-bold">
                    Base points
                  </p>
                </div>
                <div className="relative z-10 bg-black/30 p-1 sm:p-1.5 rounded-xl border border-white/20 shadow-inner group-hover:border-white/40 transition-colors flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    title="Decrease Points"
                    onClick={() =>
                      setPoints((prev) =>
                        Math.max(1, (parseInt(prev) || 5) - 1).toString(),
                      )
                    }
                    className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Points per question"
                    value={points}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "");
                      if (v === "") {
                        setPoints("");
                        return;
                      }
                      const n = Math.min(2000, Math.max(1, parseInt(v)));
                      setPoints(n.toString());
                    }}
                    onBlur={() => {
                      if (!points || parseInt(points) < 1) setPoints("5");
                    }}
                    className="w-10 sm:w-14 text-center text-base sm:text-xl text-white font-bold bg-transparent outline-none"
                  />
                  <button
                    type="button"
                    title="Increase Points"
                    onClick={() =>
                      setPoints((prev) =>
                        Math.min(2000, (parseInt(prev) || 0) + 1).toString(),
                      )
                    }
                    className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 sm:pt-4 flex justify-center w-full relative z-20 shrink-0 border-t border-white/10 mt-1 sm:mt-2">
          <motion.button
            whileHover={{
              scale: 1.02,
              y: -2,
              boxShadow: "0 0 30px rgba(255, 95, 191, 0.6)",
            }}
            whileTap={{ scale: 0.98 }}
            onClick={handleContinue}
            className="group w-[90%] sm:w-[75%] max-w-md px-6 py-3 sm:py-4 text-lg sm:text-xl font-bold inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#ff5fbf] to-[#8b5cf6] shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all duration-300"
          >
            <span className="font-bold text-white drop-shadow-md">
              Continue to Question Builder
            </span>
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-md transition-transform duration-300 group-hover:translate-x-1.5" />
          </motion.button>
        </div>
      </motion.div>

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
