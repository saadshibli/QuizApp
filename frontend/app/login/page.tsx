/**
 * Login Page — Split layout with branding panel
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { authAPI } from "@/lib/api";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Rocket,
  Zap,
  Trophy,
} from "lucide-react";
import SpaceBackground from "@/components/SpaceBackground";
import { CartoonRocket } from "@/components/SpaceBackground";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const highlights = [
    {
      icon: <Rocket className="w-5 h-5 text-pink-400" />,
      text: "Create quiz rounds in minutes",
    },
    {
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      text: "Run real-time live gameplay",
    },
    {
      icon: <Trophy className="w-5 h-5 text-cyan-400" />,
      text: "Track instant leaderboards",
    },
  ];

  const quickStats = ["Fast setup", "Live pacing", "Classroom-ready"];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.login({ email, password });
      const { token, user } = response.data;

      login(user, token);

      if (user.role === "admin") {
        router.replace("/admin/dashboard");
      } else if (user.role === "teacher") {
        router.replace("/teacher/dashboard");
      } else {
        router.replace("/student/dashboard");
      }
    } catch (err: any) {
      const respData = err.response?.data;
      const errMsg =
        typeof respData === "string"
          ? respData
          : respData?.error || "Login failed";
      setError(errMsg);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-bg min-h-screen overflow-y-auto overflow-x-hidden relative">
      <SpaceBackground />

      <Link href="/">
        <motion.button
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.97 }}
          className="fixed top-5 left-5 sm:top-7 sm:left-7 text-white/90 hover:text-white transition-all flex items-center gap-2 font-bold z-20 bg-[#18123a]/92 px-4 py-2.5 rounded-xl border border-white/20 text-sm shadow-[0_10px_24px_rgba(8,7,33,0.45)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </motion.button>
      </Link>

      <main className="relative z-10 min-h-screen flex items-center px-3 sm:px-6 lg:px-10 py-16 sm:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_45%,rgba(6,182,212,0.08)_0%,rgba(10,8,40,0.55)_45%,rgba(7,6,30,0.8)_100%)]" />

        <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-10 items-center">
          <motion.section
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
            className="hidden lg:flex lg:justify-center"
          >
            <div className="max-w-[520px] w-full min-h-[580px] rounded-[24px] bg-[#2b1f6d]/96 px-8 py-8 flex flex-col justify-center shadow-[0_28px_66px_rgba(7,6,33,0.58)] relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.12)_0%,rgba(34,211,238,0)_40%),radial-gradient(circle_at_85%_80%,rgba(139,92,246,0.14)_0%,rgba(139,92,246,0)_48%)]" />

              <div className="relative space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-300/20 text-cyan-50 text-[11px] font-semibold tracking-[0.08em] uppercase w-fit shadow-[0_8px_22px_rgba(6,182,212,0.2)]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Interactive Quiz Suite
                </div>

                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{ rotate: [0, -10, 0], y: [0, -8, 0] }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="w-14 h-14 xl:w-16 xl:h-16 shrink-0"
                  >
                    <CartoonRocket className="w-full h-full" />
                  </motion.div>

                  <div className="space-y-2">
                    <h1 className="title-cartoon text-5xl leading-[1.02]">
                      <span className="text-[#fde68a]">Quiz</span>{" "}
                      <span className="text-[#c4b5fd]">Master</span>
                    </h1>
                    <p className="text-[15px] xl:text-base text-white/92 leading-[1.45] max-w-[360px]">
                      Launch live quiz battles and keep the pace fast.
                      <br className="hidden xl:block" />
                      Climb the leaderboard in real time.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 max-w-md">
                  {quickStats.map((stat) => (
                    <div
                      key={stat}
                      className="rounded-lg bg-[#3a2680] px-3 py-2 text-center text-xs font-semibold text-white transition-all duration-200 hover:bg-[#4a3099]"
                    >
                      {stat}
                    </div>
                  ))}
                </div>

                <div className="space-y-2.5 max-w-md">
                  {highlights.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.12 }}
                      whileHover={{ x: 3, y: -1 }}
                      className="flex items-center gap-3 rounded-lg bg-[#311f6c] px-3.5 py-2.5 transition-all duration-200 hover:bg-[#3f2987] hover:shadow-[0_10px_24px_rgba(6,182,212,0.18)]"
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span className="text-white text-sm font-medium">
                        {item.text}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="w-full max-w-[520px] mx-auto lg:justify-self-center"
          >
            <div className="lg:hidden mb-6 text-center px-2">
              <h2 className="title-cartoon text-3xl sm:text-4xl mb-2">
                <span className="text-[#fde68a]">Quiz</span>{" "}
                <span className="text-[#c4b5fd]">Master</span>
              </h2>
              <p className="text-sm text-purple-100/80">
                Welcome back. Sign in to continue your live sessions.
              </p>
            </div>

            <div className="rounded-[20px] sm:rounded-[24px] bg-[#130d33]/96 p-5 sm:p-7 md:p-8 min-h-0 sm:min-h-[580px] flex flex-col justify-center shadow-[0_30px_70px_rgba(8,7,33,0.56)]">
              <div className="h-[3px] w-28 rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#6366f1] to-[#06b6d4] mb-5" />

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500 shadow-[0_0_24px_rgba(59,130,246,0.45)]">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="title-cartoon text-2xl sm:text-[30px] leading-none text-white">
                    Welcome Back
                  </h2>
                  <p className="text-[#b4aed3] text-sm font-medium mt-1">
                    Sign in to your account
                  </p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl text-red-200 text-sm font-medium alert-cartoon-error"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="block text-white/85 font-semibold text-sm">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/40 transition-colors duration-200 group-focus-within:text-cyan-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@school.edu"
                      disabled={isLoading}
                      className="w-full h-12 sm:h-[52px] rounded-xl border border-white/15 bg-white/[0.07] pl-12 pr-4 text-white placeholder:text-white/40 outline-none transition-all duration-200 hover:bg-white/[0.10] focus:border-cyan-400/60 focus:bg-white/[0.09] focus:shadow-[0_0_0_4px_rgba(34,211,238,0.14)]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-white/85 font-semibold text-sm">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/40 transition-colors duration-200 group-focus-within:text-cyan-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={isLoading}
                      className="w-full h-12 sm:h-[52px] rounded-xl border border-white/15 bg-white/[0.07] pl-12 pr-12 text-white placeholder:text-white/40 outline-none transition-all duration-200 hover:bg-white/[0.10] focus:border-cyan-400/60 focus:bg-white/[0.09] focus:shadow-[0_0_0_4px_rgba(34,211,238,0.14)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-white/40 hover:text-cyan-400 hover:bg-white/5 transition-colors duration-200"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="w-[18px] h-[18px]" />
                      ) : (
                        <Eye className="w-[18px] h-[18px]" />
                      )}
                    </button>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.016, y: -1 }}
                  whileTap={{ scale: 0.985 }}
                  disabled={isLoading}
                  type="submit"
                  className="w-full h-12 sm:h-[54px] rounded-xl bg-gradient-to-r from-[#7c3aed] via-[#6366f1] to-[#2563eb] text-white font-extrabold tracking-wide shadow-[0_16px_34px_rgba(79,70,229,0.46)] hover:shadow-[0_22px_44px_rgba(79,70,229,0.62)] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 relative overflow-hidden group text-sm sm:text-base"
                >
                  <span className="pointer-events-none absolute inset-0 opacity-0 bg-[linear-gradient(110deg,rgba(255,255,255,0)_25%,rgba(255,255,255,0.28)_50%,rgba(255,255,255,0)_75%)] transition-opacity duration-200 group-hover:opacity-100" />
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </form>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/[0.1]" />
                <span className="text-[#7e78a8] text-xs font-semibold">OR</span>
                <div className="flex-1 h-px bg-white/[0.1]" />
              </div>

              <div className="space-y-2 text-center">
                <p className="text-sm text-white/55">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="text-[#22d3ee] hover:text-cyan-200 font-bold transition-colors"
                  >
                    Create one
                  </Link>
                </p>
              </div>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
