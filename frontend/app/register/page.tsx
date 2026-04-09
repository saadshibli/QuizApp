/**
 * Register Page — Two-column with role visuals and stepper feel
 */

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { authAPI } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  Presentation,
  Camera,
  ImageIcon,
} from "lucide-react";
import SpaceBackground from "@/components/SpaceBackground";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"teacher" | "student" | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [avatarMode, setAvatarMode] = useState<"icon" | "gallery">("icon");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const ICON_OPTIONS = [
    "🦊",
    "🐱",
    "🐶",
    "🐼",
    "🦁",
    "🐸",
    "🐵",
    "🐰",
    "🦄",
    "🐲",
    "🐯",
    "🦉",
    "🐺",
    "🦈",
    "🐙",
    "🦋",
    "🤖",
    "👾",
    "🎮",
    "🚀",
    "⚡",
    "🔥",
    "💎",
    "🌟",
    "🧑‍🚀",
    "🧙",
    "🦸",
    "🧛",
    "🎭",
    "🐻‍❄️",
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!role) {
      setError("Please select a role to continue.");
      return;
    }

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const registerPayload: any = { name, email, password, role };
      if (selectedIcon) registerPayload.avatar = selectedIcon;
      const response = await authAPI.register(registerPayload);
      const { token, user } = response.data;
      login(user, token);

      // Upload avatar image if a gallery file was selected
      if (avatarFile) {
        try {
          const formData = new FormData();
          formData.append("avatar", avatarFile);
          const profileRes = await authAPI.updateProfile(formData);
          const updatedUser = profileRes.data;
          useAuthStore.getState().setUser({
            ...user,
            avatar: updatedUser.avatar,
          });
        } catch {
          // Non-critical — account created, avatar upload failed silently
        }
      }

      if (user.role === "admin") {
        router.replace("/admin/dashboard");
      } else if (user.role === "teacher") {
        router.replace("/teacher/dashboard");
      } else {
        router.replace("/student/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed");
      setIsLoading(false);
    }
  };

  const currentStep = !role
    ? 1
    : !name.trim() || !email.trim() || !password.trim()
      ? 2
      : 3;

  return (
    <div className="space-bg h-screen overflow-hidden relative">
      <SpaceBackground />

      <Link href="/">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="fixed top-6 left-6 sm:top-8 sm:left-8 text-white/70 hover:text-white transition-all flex items-center gap-2 font-bold z-20 bg-white/[0.06] px-4 py-2.5 rounded-xl backdrop-blur-md border border-white/10 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </motion.button>
      </Link>

      <div className="relative z-10 h-full flex flex-col lg:flex-row lg:items-center lg:gap-6 px-3 sm:px-6 lg:px-10">
        {/* Left: Role Selection Visual */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex lg:flex-1 flex-col items-center justify-center py-4"
        >
          <div className="max-w-[480px] w-full rounded-[24px] bg-white/[0.04] border border-white/[0.1] backdrop-blur-xl p-6 flex flex-col justify-between shadow-[0_20px_50px_rgba(9,7,35,0.45)]">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-5"
            >
              <p className="text-[11px] uppercase tracking-[0.08em] text-cyan-200/80 font-semibold mb-3">
                Signup Flow
              </p>
              <h2 className="title-cartoon text-4xl mb-2">
                <span className="text-[#fde68a]">Join</span>{" "}
                <span className="text-[#c4b5fd]">the Arena</span>
              </h2>
              <p className="text-purple-200/75 text-sm">
                Complete the steps on the right to create your account.
              </p>
            </motion.div>

            <div className="space-y-2.5">
              {[
                { step: 1, label: "Select your role" },
                { step: 2, label: "Fill your account details" },
                { step: 3, label: "Create your account" },
              ].map(({ step, label }) => {
                const isActive = currentStep === step;
                const isCompleted = currentStep > step;
                return (
                  <div
                    key={step}
                    className={`rounded-xl px-4 py-2.5 border transition-all duration-300 flex items-center gap-3 ${
                      isActive
                        ? "border-cyan-300/25 bg-cyan-300/10"
                        : isCompleted
                          ? "border-emerald-400/25 bg-emerald-400/10"
                          : "border-white/12 bg-white/[0.04]"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                        isActive
                          ? "bg-cyan-400/30 text-cyan-100"
                          : isCompleted
                            ? "bg-emerald-400/30 text-emerald-200"
                            : "bg-white/10 text-white/50"
                      }`}
                    >
                      {isCompleted ? "✓" : step}
                    </div>
                    <div>
                      <p
                        className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${
                          isActive
                            ? "text-cyan-100"
                            : isCompleted
                              ? "text-emerald-200"
                              : "text-white/70"
                        }`}
                      >
                        Step {step}
                      </p>
                      <p
                        className={`text-sm ${
                          isActive
                            ? "text-white/85"
                            : isCompleted
                              ? "text-white/75"
                              : "text-white/60"
                        }`}
                      >
                        {label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-4 text-center"
            >
              <div className="flex items-center justify-center gap-1.5 text-[#9c95c1] text-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Secure signup · Role-based access</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Right: Registration Form */}
        <div className="flex-1 flex items-center justify-center py-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-[520px]"
          >
            <div className="rounded-[30px] p-[1px] bg-gradient-to-br from-[#8b5cf6]/58 via-[#3b82f6]/30 to-[#06b6d4]/52 shadow-[0_30px_80px_rgba(8,7,33,0.62)]">
              <div className="rounded-[29px] bg-[#140f2f]/84 backdrop-blur-[18px] p-4 sm:p-5 flex flex-col shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <div className="h-[3px] w-28 rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#6366f1] to-[#06b6d4] mb-4" />
                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500 shadow-[0_0_24px_rgba(59,130,246,0.45)]">
                      <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="title-cartoon text-2xl text-white">
                        Create Account
                      </h1>
                      <p className="text-[#a29bc7] text-sm mt-0.5">
                        Join the quiz arena
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-3 flex-1">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-xl text-red-200 text-sm font-medium alert-cartoon-error"
                    >
                      {error}
                    </motion.div>
                  )}

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-white/90 font-semibold text-sm">
                        Select Role
                      </label>
                      {role && (
                        <span className="text-xs font-semibold text-cyan-300">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole("teacher")}
                        className={`p-2.5 sm:p-3 flex items-center gap-3 rounded-xl border transition-all ${
                          role === "teacher"
                            ? "bg-pink-500/15 border-pink-400/55 text-white shadow-[0_10px_26px_rgba(236,72,153,0.24)]"
                            : "bg-white/[0.04] border-white/[0.12] text-white/80 hover:bg-white/[0.06] hover:border-white/[0.2]"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${role === "teacher" ? "bg-gradient-to-br from-pink-500 to-rose-600" : "bg-white/[0.07]"}`}
                        >
                          <Presentation
                            className={`w-5 h-5 ${role === "teacher" ? "text-white" : "text-white/70"}`}
                          />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm">Teacher</p>
                          <p className="text-xs text-white/60">Host sessions</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole("student")}
                        className={`p-2.5 sm:p-3 flex items-center gap-3 rounded-xl border transition-all ${
                          role === "student"
                            ? "bg-cyan-500/15 border-cyan-400/55 text-white shadow-[0_10px_26px_rgba(6,182,212,0.24)]"
                            : "bg-white/[0.04] border-white/[0.12] text-white/80 hover:bg-white/[0.06] hover:border-white/[0.2]"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${role === "student" ? "bg-gradient-to-br from-cyan-500 to-blue-600" : "bg-white/[0.07]"}`}
                        >
                          <GraduationCap
                            className={`w-5 h-5 ${role === "student" ? "text-white" : "text-white/70"}`}
                          />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm">Student</p>
                          <p className="text-xs text-white/60">Join quizzes</p>
                        </div>
                      </button>
                    </div>
                    {!role && (
                      <p className="text-xs text-amber-200/85">
                        Select a role to unlock account details.
                      </p>
                    )}
                  </div>

                  <div
                    className={`space-y-3 transition-all duration-200 ${role ? "opacity-100" : "opacity-55"}`}
                  >
                    <fieldset
                      disabled={!role || isLoading}
                      className="space-y-3"
                    >
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="block text-white/85 font-semibold text-sm">
                            Full Name
                          </label>
                          <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/40 transition-colors duration-200 group-focus-within:text-cyan-400" />
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full h-10 sm:h-11 rounded-xl border border-white/12 bg-white/[0.045] pl-12 pr-4 text-white text-sm placeholder:text-white/35 outline-none transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06] focus:border-cyan-300/70 focus:bg-white/[0.07] focus:shadow-[0_0_0_4px_rgba(34,211,238,0.14),0_10px_24px_rgba(6,182,212,0.12)] disabled:cursor-not-allowed"
                              placeholder="John Doe"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-white/85 font-semibold text-sm">
                            Email
                          </label>
                          <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/40 transition-colors duration-200 group-focus-within:text-cyan-400" />
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full h-10 sm:h-11 rounded-xl border border-white/12 bg-white/[0.045] pl-12 pr-4 text-white text-sm placeholder:text-white/35 outline-none transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06] focus:border-cyan-300/70 focus:bg-white/[0.07] focus:shadow-[0_0_0_4px_rgba(34,211,238,0.14),0_10px_24px_rgba(6,182,212,0.12)] disabled:cursor-not-allowed"
                              placeholder="you@example.com"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-white/85 font-semibold text-sm">
                          Profile Picture
                        </label>

                        {/* Mode toggle */}
                        <div className="flex rounded-xl overflow-hidden border border-white/15">
                          <button
                            type="button"
                            onClick={() => setAvatarMode("icon")}
                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                              avatarMode === "icon"
                                ? "bg-purple-500/25 text-purple-200 border-r border-white/15"
                                : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] border-r border-white/15"
                            }`}
                          >
                            <span className="text-sm">😎</span> Choose Icon
                          </button>
                          <button
                            type="button"
                            onClick={() => setAvatarMode("gallery")}
                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                              avatarMode === "gallery"
                                ? "bg-cyan-500/25 text-cyan-200"
                                : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"
                            }`}
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> Gallery
                          </button>
                        </div>

                        {/* Icon picker */}
                        {avatarMode === "icon" && (
                          <div className="flex flex-wrap gap-1 sm:gap-1.5">
                            {ICON_OPTIONS.map((icon) => (
                              <button
                                key={icon}
                                type="button"
                                onClick={() => {
                                  setSelectedIcon(icon);
                                  setAvatarFile(null);
                                  setAvatarPreview(null);
                                }}
                                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-base sm:text-lg transition-all duration-200 ${
                                  selectedIcon === icon
                                    ? "bg-purple-500/30 border-2 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)] scale-110"
                                    : "bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] hover:border-white/20"
                                }`}
                              >
                                {icon}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Gallery upload */}
                        {avatarMode === "gallery" && (
                          <div className="flex items-center gap-4">
                            <div className="relative group">
                              <div className="w-16 h-16 rounded-full border-2 border-white/15 overflow-hidden bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                                {avatarPreview ? (
                                  <Image
                                    src={avatarPreview}
                                    alt="Avatar preview"
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <User className="w-7 h-7 text-white/40" />
                                )}
                              </div>
                              <button
                                type="button"
                                aria-label="Upload avatar image"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                              >
                                <Camera className="w-5 h-5 text-white" />
                              </button>
                            </div>
                            <div className="flex-1">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-sm font-semibold text-cyan-300 hover:text-cyan-200 transition-colors flex items-center gap-1.5"
                              >
                                <ImageIcon className="w-4 h-4" />
                                {avatarPreview
                                  ? "Change image"
                                  : "Choose from gallery"}
                              </button>
                              <p className="text-xs text-white/40 mt-1">
                                JPG, PNG or GIF · Max 5 MB
                              </p>
                              {avatarFile && (
                                <p className="text-xs text-emerald-300 mt-0.5 truncate max-w-[200px]">
                                  {avatarFile.name}
                                </p>
                              )}
                            </div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              aria-label="Upload profile picture"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (!file.type.startsWith("image/")) return;
                                if (file.size > 5 * 1024 * 1024) {
                                  setError("Image must be under 5 MB.");
                                  return;
                                }
                                setAvatarFile(file);
                                setAvatarPreview(URL.createObjectURL(file));
                                setSelectedIcon(null);
                              }}
                              className="hidden"
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-white/85 font-semibold text-sm">
                          Password
                        </label>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/40 transition-colors duration-200 group-focus-within:text-cyan-400" />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-10 sm:h-11 rounded-xl border border-white/12 bg-white/[0.045] pl-12 pr-12 text-white text-sm placeholder:text-white/35 outline-none transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06] focus:border-cyan-300/70 focus:bg-white/[0.07] focus:shadow-[0_0_0_4px_rgba(34,211,238,0.14),0_10px_24px_rgba(6,182,212,0.12)] disabled:cursor-not-allowed"
                            placeholder="Create a password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-white/40 hover:text-cyan-400 hover:bg-white/10 transition-colors duration-200"
                            aria-label={
                              showPassword ? "Hide password" : "Show password"
                            }
                            disabled={!role || isLoading}
                          >
                            {showPassword ? (
                              <EyeOff className="w-[18px] h-[18px]" />
                            ) : (
                              <Eye className="w-[18px] h-[18px]" />
                            )}
                          </button>
                        </div>
                      </div>
                    </fieldset>
                  </div>

                  <div>
                    <motion.button
                      whileHover={{ scale: role ? 1.016 : 1, y: role ? -1 : 0 }}
                      whileTap={{ scale: role ? 0.985 : 1 }}
                      type="submit"
                      disabled={isLoading || !role}
                      className={`w-full h-10 sm:h-11 rounded-xl text-sm font-bold btn-cartoon inline-flex items-center justify-center gap-2 disabled:opacity-55 disabled:cursor-not-allowed ${
                        role === "teacher"
                          ? "btn-cartoon-pink"
                          : role === "student"
                            ? "btn-cartoon-blue"
                            : "btn-cartoon-primary"
                      }`}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating account...
                        </span>
                      ) : (
                        <>
                          Create Account
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>

                {/* Footer */}
                <div className="mt-3 text-center">
                  <p className="text-sm text-white/50">
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className="text-[#06b6d4] hover:text-[#22d3ee] font-bold transition-colors"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
