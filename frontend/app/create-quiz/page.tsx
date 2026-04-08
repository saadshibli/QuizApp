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
      router.replace("/login");
    }
  }, [user, _hasHydrated, router]);

  // Settings State
  const [activeThemeId, setActiveThemeId] = useState<string>("none");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState("5");
  const [points, setPoints] = useState("5");
  const [advanceMode, setAdvanceMode] = useState<"auto" | "manual">("auto");
  const [advanceSeconds, setAdvanceSeconds] = useState("5");

  const currentTheme = THEMES[activeThemeId] || THEMES.none;

  const handleContinue = () => {
    const payload = {
      title,
      description,
      theme: activeThemeId,
      timeLimit: parseInt(timeLimit, 10) || 5,
      points: parseInt(points, 10) || 5,
      advance_mode: advanceMode,
      advance_seconds: parseInt(advanceSeconds, 10) || 5,
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
    <div className="space-bg h-[100dvh] w-full relative flex flex-col overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[#0f0028]">
        <SpaceBackground />
      </div>

      {/* Compact top bar */}
      <header className="relative z-20 shrink-0 flex items-center justify-between px-4 sm:px-6 py-3">
        <Link href="/teacher/dashboard">
          <motion.div
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            className="btn-cartoon btn-cartoon-outline px-4 py-2 flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white rounded-2xl shadow-lg hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold hidden sm:inline">Back</span>
          </motion.div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs font-bold tracking-wider uppercase shadow-inner">
            <span className={`w-2 h-2 rounded-full animate-pulse ${activeThemeId === "none" ? "bg-white" : "bg-purple-400"}`} />
            Step 1 of 3
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02, y: -1, boxShadow: "0 0 30px rgba(255, 95, 191, 0.6)" }}
          whileTap={{ scale: 0.98 }}
          onClick={handleContinue}
          className="group px-5 sm:px-6 py-2.5 font-bold inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff5fbf] to-[#8b5cf6] shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all text-sm sm:text-base text-white"
        >
          <span className="hidden sm:inline">Continue to Builder</span>
          <span className="sm:hidden">Continue</span>
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1" />
        </motion.button>
      </header>

      {/* Main Card — centered, wide, scrollable on mobile */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex items-start lg:items-center justify-center px-3 sm:px-6 lg:px-8 py-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
          className={`w-full max-w-7xl rounded-3xl backdrop-blur-xl border p-4 sm:p-6 lg:p-8 relative overflow-hidden ${currentTheme.borderClass} ${currentTheme.glowClass} ${currentTheme.cardClass}`}
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

          <div className="relative z-10 space-y-4 sm:space-y-5">
            {/* Row 1: Title + Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-black/30 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/10 group hover:bg-black/40 hover:border-white/20 transition-all shadow-lg">
                <label htmlFor="title" className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1.5 ${currentTheme.accentText}`}>
                  <Type className="w-4 h-4" /> Quiz Title
                </label>
                <input
                  id="title"
                  type="text"
                  placeholder="Enter your quiz title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                  className="w-full bg-black/20 border-2 border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/40 font-bold focus:outline-none focus:border-purple-400/50 transition-all text-sm sm:text-base shadow-inner"
                />
              </div>
              <div className="bg-black/30 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/10 group hover:bg-black/40 hover:border-white/20 transition-all shadow-lg">
                <label htmlFor="description" className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1.5 ${currentTheme.accentText}`}>
                  <AlignLeft className="w-4 h-4" /> Description <span className="text-white/50 font-normal text-[10px]">(Optional)</span>
                </label>
                <input
                  id="description"
                  type="text"
                  placeholder="What's this quiz about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black/20 border-2 border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/40 font-bold focus:outline-none focus:border-purple-400/50 transition-all text-sm sm:text-base shadow-inner"
                />
              </div>
            </div>

            {/* Row 2: Theme Carousel */}
            <div className="bg-black/30 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/10 hover:bg-black/40 hover:border-white/20 transition-all shadow-lg">
              <div className={`flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-3 ${currentTheme.accentText}`}>
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4" /> Choose Gameplay Theme
                </div>
                <span className="bg-black/40 px-2.5 py-0.5 rounded-lg text-white/60 text-[10px] border border-white/10 hidden sm:inline-block">
                  {Object.keys(THEMES).length} Themes
                </span>
              </div>

              <div className="relative group/slider -mx-1">
                <button
                  type="button"
                  title="Scroll Left"
                  onClick={() => scrollThemes("left")}
                  className="absolute left-1 top-1/2 -translate-y-1/2 z-30 p-1.5 bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 rounded-full text-white transition-all active:scale-95 opacity-0 group-hover/slider:opacity-100 hidden sm:flex items-center justify-center shadow-xl"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  title="Scroll Right"
                  onClick={() => scrollThemes("right")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 z-30 p-1.5 bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 rounded-full text-white transition-all active:scale-95 opacity-0 group-hover/slider:opacity-100 hidden sm:flex items-center justify-center shadow-xl"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div
                  ref={themeScrollRef}
                  className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar py-1 px-2"
                >
                  {Object.values(THEMES).map((theme) => {
                    const isSelected = activeThemeId === theme.id;
                    return (
                      <motion.button
                        type="button"
                        key={theme.id}
                        whileHover={{ scale: 1.05, y: -3 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setActiveThemeId(theme.id)}
                        className={`snap-center shrink-0 w-24 sm:w-32 lg:w-36 h-36 sm:h-40 lg:h-44 rounded-2xl relative overflow-hidden flex flex-col border-[3px] transition-all duration-300 ${isSelected ? "border-white ring-2 ring-purple-500/60 shadow-[0_0_25px_rgba(139,92,246,0.4)]" : "border-transparent hover:border-white/30 saturate-[.6] hover:saturate-100"} ${theme.cardClass}`}
                      >
                        <div className="absolute inset-0 z-0">
                          {theme.image ? (
                            <Image src={theme.image} alt={theme.name} fill className="object-cover opacity-60 mix-blend-screen" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#1a0b2e] to-[#0f0028] opacity-80" />
                          )}
                        </div>
                        <div className={`absolute inset-0 bg-gradient-to-t ${isSelected ? "from-purple-900/90 via-purple-900/20" : "from-black/90 via-black/20"} to-transparent z-10`} />
                        <div className="relative z-20 flex-1 flex flex-col items-center justify-end pb-2.5 p-2">
                          <span className={`text-[11px] sm:text-xs font-black text-center leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${isSelected ? "text-white" : "text-white/70"}`}>
                            {theme.name}
                          </span>
                          {isSelected && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2 bg-white text-purple-600 rounded-full p-0.5 shadow-lg">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12" /></svg>
                            </motion.div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Row 3: Time Limit + Points + Advance Mode */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              {/* Time Limit */}
              <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 hover:bg-black/40 hover:border-white/20 transition-all shadow-lg">
                <label className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3 ${currentTheme.accentText}`}>
                  <Clock className="w-4 h-4" /> Time Limit
                </label>
                <div className="flex items-center justify-between">
                  <p className="text-white/50 text-xs font-bold">Per Question</p>
                  <div className="bg-black/30 p-1.5 rounded-xl border border-white/20 shadow-inner flex items-center gap-1.5">
                    <button type="button" title="Decrease Time Limit" onClick={() => setTimeLimit((prev) => Math.max(1, (parseInt(prev) || 5) - 1).toString())} className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition-colors text-lg">-</button>
                    <input type="text" inputMode="numeric" aria-label="Time limit in seconds" value={timeLimit} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); if (v === "") { setTimeLimit(""); return; } const n = Math.min(120, Math.max(1, parseInt(v))); setTimeLimit(n.toString()); }} onBlur={() => { if (!timeLimit || parseInt(timeLimit) < 1) setTimeLimit("5"); }} className="w-12 text-center text-xl text-white font-bold bg-transparent outline-none" />
                    <button type="button" title="Increase Time Limit" onClick={() => setTimeLimit((prev) => Math.min(120, (parseInt(prev) || 0) + 1).toString())} className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition-colors text-lg">+</button>
                  </div>
                </div>
              </div>

              {/* Points */}
              <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 hover:bg-black/40 hover:border-white/20 transition-all shadow-lg">
                <label className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3 ${currentTheme.accentText}`}>
                  <Star className="w-4 h-4" /> Points
                </label>
                <div className="flex items-center justify-between">
                  <p className="text-white/50 text-xs font-bold">Base Points</p>
                  <div className="bg-black/30 p-1.5 rounded-xl border border-white/20 shadow-inner flex items-center gap-1.5">
                    <button type="button" title="Decrease Points" onClick={() => setPoints((prev) => Math.max(1, (parseInt(prev) || 5) - 1).toString())} className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition-colors text-lg">-</button>
                    <input type="text" inputMode="numeric" aria-label="Points per question" value={points} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); if (v === "") { setPoints(""); return; } const n = Math.min(2000, Math.max(1, parseInt(v))); setPoints(n.toString()); }} onBlur={() => { if (!points || parseInt(points) < 1) setPoints("5"); }} className="w-12 text-center text-xl text-white font-bold bg-transparent outline-none" />
                    <button type="button" title="Increase Points" onClick={() => setPoints((prev) => Math.min(2000, (parseInt(prev) || 0) + 1).toString())} className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition-colors text-lg">+</button>
                  </div>
                </div>
              </div>

              {/* Advance Mode */}
              <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 hover:bg-black/40 hover:border-white/20 transition-all shadow-lg">
                <label className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3 ${currentTheme.accentText}`}>
                  <ArrowRight className="w-4 h-4" /> Advance Mode
                </label>
                <div className="flex gap-2">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setAdvanceMode("auto")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setAdvanceMode("auto"); }}
                    className={`flex-1 rounded-xl p-2.5 border-2 transition-all cursor-pointer ${advanceMode === "auto" ? "bg-cyan-500/10 border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "bg-black/30 border-white/10 hover:bg-black/40 hover:border-white/20"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className={`w-3.5 h-3.5 ${advanceMode === "auto" ? "text-cyan-400" : "text-white/40"}`} />
                      <span className="text-xs font-bold text-white">Auto</span>
                    </div>
                    {advanceMode === "auto" && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <div className="bg-black/40 p-0.5 rounded-lg border border-white/20 flex items-center gap-0.5">
                          <button type="button" onClick={(e) => { e.stopPropagation(); setAdvanceSeconds((prev) => Math.max(3, (parseInt(prev) || 5) - 1).toString()); }} className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded text-white font-bold text-xs transition-colors">-</button>
                          <input type="text" inputMode="numeric" aria-label="Advance delay seconds" value={advanceSeconds} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); const v = e.target.value.replace(/[^0-9]/g, ""); if (v === "") { setAdvanceSeconds(""); return; } setAdvanceSeconds(v.length > 2 ? v.slice(0, 2) : v); }} onBlur={() => { const n = parseInt(advanceSeconds); if (!advanceSeconds || isNaN(n) || n < 3) setAdvanceSeconds("3"); else if (n > 60) setAdvanceSeconds("60"); }} className="w-8 text-center text-xs text-white font-bold bg-transparent outline-none" />
                          <button type="button" onClick={(e) => { e.stopPropagation(); setAdvanceSeconds((prev) => Math.min(60, (parseInt(prev) || 5) + 1).toString()); }} className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded text-white font-bold text-xs transition-colors">+</button>
                        </div>
                        <span className="text-[10px] text-white/50 font-bold">sec</span>
                      </div>
                    )}
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setAdvanceMode("manual")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setAdvanceMode("manual"); }}
                    className={`flex-1 rounded-xl p-2.5 border-2 transition-all cursor-pointer ${advanceMode === "manual" ? "bg-purple-500/10 border-purple-400/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]" : "bg-black/30 border-white/10 hover:bg-black/40 hover:border-white/20"}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <ArrowRight className={`w-3.5 h-3.5 ${advanceMode === "manual" ? "text-purple-400" : "text-white/40"}`} />
                      <span className="text-xs font-bold text-white">Manual</span>
                    </div>
                    <p className="text-white/40 text-[9px] mt-1 leading-tight">Teacher clicks Next</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

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
