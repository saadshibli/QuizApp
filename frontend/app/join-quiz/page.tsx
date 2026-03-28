/**
 * Join Quiz Page — Immersive full-screen code entry
 */
"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sessionAPI } from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Gamepad2,
  Zap,
  Trophy,
  Users,
} from "lucide-react";
import SpaceBackground from "@/components/SpaceBackground";
import { CartoonRocket } from "@/components/SpaceBackground";

function JoinQuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCode = searchParams.get("code") || "";

  const { user } = useAuthStore();

  const [sessionCode, setSessionCode] = useState(prefillCode);
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [invalidCode, setInvalidCode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionCode.length !== 6) return;
    setError("");
    setInvalidCode(false);
    setLoading(true);

    try {
      const response = await sessionAPI.joinSession({
        session_code: sessionCode.toUpperCase(),
        nickname: nickname || user?.name || "Player",
      });

      if (response.data.token) {
        useAuthStore.getState().login(
          {
            id: response.data.guestUserId,
            name: nickname || "Player",
            email: "",
            role: "student",
          },
          response.data.token,
        );
      }

      router.push(
        `/quiz-player/${response.data.session_code || sessionCode.toUpperCase()}`,
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to join. Check the code and try again.";
      setError(msg);
      setInvalidCode(true);
    } finally {
      setLoading(false);
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

  return (
    <div className="space-bg min-h-screen relative overflow-hidden flex flex-col">
      <SpaceBackground />

      {/* Back button */}
      <motion.button
        type="button"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => router.back()}
        className="fixed top-6 left-6 sm:top-8 sm:left-8 z-30 text-white/70 hover:text-white transition-all flex items-center gap-2 font-bold bg-white/[0.06] px-4 py-2.5 rounded-xl backdrop-blur-md border border-white/10 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </motion.button>

      {/* Main content — vertically centered, full width */}
      <div className="flex-1 flex items-center justify-center px-4 py-5 sm:py-6 relative z-10">
        <div className="w-full max-w-2xl">
          {/* Top: Rocket + Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-5"
          >
            <motion.div
              animate={{ rotate: [0, -8, 0], y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-14 h-14 mx-auto mb-3"
            >
              <CartoonRocket className="w-full h-full" />
            </motion.div>
            <h1 className="title-cartoon text-4xl sm:text-5xl gradient-text-pink-cyan mb-1.5">
              Ready to Play?
            </h1>
            <p className="text-[#b7b1d4] text-sm">
              Drop in fast. Enter your code and take your spot in the live
              match.
            </p>
          </motion.div>

          {/* Central form card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="cartoon-panel p-6 md:p-7">
              <form onSubmit={handleJoin} className="space-y-5">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl text-red-200 text-sm font-medium alert-cartoon-error"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Session Code — Large boxes */}
                <div>
                  <label className="block text-white/70 font-semibold mb-3 text-xs uppercase tracking-[0.16em] text-center">
                    Session Code
                  </label>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      maxLength={6}
                      value={sessionCode}
                      onChange={(e) =>
                        setSessionCode(
                          e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, ""),
                        )
                      }
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData
                          .getData("text")
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, "")
                          .slice(0, 6);
                        if (pasted) setSessionCode(pasted);
                      }}
                      onFocus={() => setFocusedIdx(sessionCode.length)}
                      onBlur={() => setFocusedIdx(-1)}
                      className="absolute inset-0 opacity-0 z-10 cursor-text"
                      style={{ caretColor: "transparent" }}
                      aria-label="Session code"
                      disabled={loading}
                      autoFocus
                    />
                    <div
                      className="flex gap-2.5 sm:gap-3 justify-center"
                      onClick={() => inputRef.current?.focus()}
                    >
                      {codeChars.map((char, idx) => {
                        const isFocused =
                          focusedIdx >= 0 && sessionCode.length === idx;
                        const isFilled = char.trim() !== "";
                        return (
                          <motion.div
                            key={idx}
                            whileHover={{ y: -1.5, scale: 1.02 }}
                            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-black font-display cursor-text transition-all duration-200 ${
                              isFocused
                                ? "border-2 border-cyan-300 bg-cyan-400/14"
                                : isFilled
                                  ? "border-2 border-violet-300/70 bg-violet-500/14"
                                  : "border-2 border-white/25 bg-white/[0.06]"
                            }`}
                            style={{
                              boxShadow: isFocused
                                ? "0 0 0 3px rgba(34,211,238,0.16), 0 0 26px rgba(34,211,238,0.22)"
                                : isFilled
                                  ? "0 6px 18px rgba(0,0,0,0.28)"
                                  : "0 4px 14px rgba(0,0,0,0.2)",
                            }}
                            animate={isFocused ? { scale: [1, 1.04, 1] } : {}}
                            transition={{ duration: 0.8, repeat: Infinity }}
                          >
                            {isFilled && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 400 }}
                                className="text-white"
                              >
                                {char}
                              </motion.span>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    <motion.div
                      key={codeStatus}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 text-center text-xs font-semibold"
                    >
                      {codeStatus === "invalid" && (
                        <span className="text-rose-300">
                          Invalid session code. Please check and try again.
                        </span>
                      )}
                      {codeStatus === "empty" && (
                        <span className="text-white/55">
                          Enter the 6-character code to continue.
                        </span>
                      )}
                      {codeStatus === "partial" && (
                        <span className="text-amber-300">
                          Code incomplete: {sessionCode.length}/6
                        </span>
                      )}
                      {codeStatus === "valid" && !loading && (
                        <span className="text-emerald-300">
                          Code format looks good.
                        </span>
                      )}
                    </motion.div>
                  </div>
                </div>

                {/* Nickname full width */}
                <div>
                  <label className="block text-white/70 font-semibold mb-2 text-xs uppercase tracking-[0.16em]">
                    Nickname
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-white/[0.07] border-2 border-white/20 text-white placeholder:text-white/40 outline-none transition-all focus:border-cyan-300/70 focus:bg-cyan-400/8 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.14),0_0_24px_rgba(34,211,238,0.16)]"
                    placeholder="Pick a display name"
                    disabled={loading}
                  />
                </div>

                {/* Prominent full-width action */}
                <motion.button
                  type="submit"
                  disabled={loading || sessionCode.length !== 6}
                  whileHover={
                    sessionCode.length === 6 ? { scale: 1.01, y: -1 } : {}
                  }
                  whileTap={sessionCode.length === 6 ? { scale: 0.99 } : {}}
                  className={`w-full h-12 rounded-xl font-extrabold text-base text-white relative overflow-hidden transition-all ${
                    sessionCode.length === 6
                      ? "bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 shadow-[0_12px_28px_rgba(59,130,246,0.32)] hover:shadow-[0_14px_32px_rgba(59,130,246,0.44)] border border-cyan-200/35"
                      : "bg-white/8 border border-white/14 opacity-50 cursor-not-allowed"
                  }`}
                >
                  {sessionCode.length === 6 && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                      animate={{ x: [-120, 260] }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  )}
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
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
              </form>
            </div>
          </motion.div>

          {/* Bottom info strip (enhanced) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5"
          >
            {[
              {
                icon: <Zap className="w-4 h-4 text-amber-400" />,
                text: "Join in seconds",
              },
              {
                icon: <Users className="w-4 h-4 text-cyan-400" />,
                text: "Real-time players",
              },
              {
                icon: <Trophy className="w-4 h-4 text-pink-400" />,
                text: "Instant rank updates",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -1, scale: 1.01 }}
                className="flex items-center gap-2.5 py-3 px-4 rounded-xl bg-white/[0.05] border border-white/[0.12] justify-center"
              >
                {item.icon}
                <span className="text-white/72 text-xs font-semibold">
                  {item.text}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function JoinQuizPage() {
  return (
    <Suspense
      fallback={
        <div className="space-bg min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      }
    >
      <JoinQuizContent />
    </Suspense>
  );
}
