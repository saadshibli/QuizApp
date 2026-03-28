"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store/authStore";
import { ArrowRight, Play, Zap } from "lucide-react";
import {
  CartoonRocket,
  MiniPlanet,
  SparkleRing,
  Stars,
  ShootingStar,
} from "@/components/SpaceBackground";

// -----------------------------------------------------------------------------
// Card Icons
// -----------------------------------------------------------------------------
function CreateIcon() {
  return (
    <svg viewBox="0 0 56 56" className="w-11 h-11" fill="none" aria-hidden>
      <rect
        x="4"
        y="6"
        width="32"
        height="40"
        rx="8"
        fill="#fef3c7"
        stroke="#f59e0b"
        strokeWidth="2.5"
      />
      <path
        d="M11 16H28"
        stroke="#f59e0b"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M11 23H24"
        stroke="#fbbf24"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M11 30H20"
        stroke="#fcd34d"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx="42"
        cy="14"
        r="10"
        fill="#ec4899"
        stroke="#be185d"
        strokeWidth="2"
      />
      <path
        d="M42 9V19M37 14H47"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle
        cx="42"
        cy="40"
        r="8"
        fill="#a855f7"
        stroke="#7c3aed"
        strokeWidth="2"
      />
      <path
        d="M38 40L41 43L46 37"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HostIcon() {
  return (
    <svg viewBox="0 0 56 56" className="w-11 h-11" fill="none" aria-hidden>
      <rect
        x="4"
        y="6"
        width="42"
        height="30"
        rx="6"
        fill="#dbeafe"
        stroke="#3b82f6"
        strokeWidth="2.5"
      />
      <rect
        x="10"
        y="12"
        width="30"
        height="18"
        rx="4"
        fill="#3b82f6"
        opacity="0.15"
      />
      <circle
        cx="25"
        cy="21"
        r="6"
        fill="#3b82f6"
        stroke="#1d4ed8"
        strokeWidth="2"
      />
      <path
        d="M25 17V21L28 24"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="16" y="36" width="18" height="4" rx="2" fill="#60a5fa" />
      <rect x="12" y="40" width="26" height="4" rx="2" fill="#3b82f6" />
      <circle
        cx="46"
        cy="10"
        r="6"
        fill="#22c55e"
        stroke="#15803d"
        strokeWidth="1.5"
      />
      <path
        d="M44 10L45.5 11.5L48.5 8.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CompeteIcon() {
  return (
    <svg viewBox="0 0 56 56" className="w-11 h-11" fill="none" aria-hidden>
      <path
        d="M14 6H42V22C42 32 36 40 28 42C20 40 14 32 14 22V6Z"
        fill="#fef3c7"
        stroke="#f59e0b"
        strokeWidth="2.5"
      />
      <path
        d="M14 14H6C4 14 2 17 4 24L14 21"
        fill="#fbbf24"
        stroke="#f59e0b"
        strokeWidth="1.5"
      />
      <path
        d="M42 14H50C52 14 54 17 52 24L42 21"
        fill="#fbbf24"
        stroke="#f59e0b"
        strokeWidth="1.5"
      />
      <circle
        cx="28"
        cy="22"
        r="7"
        fill="#f59e0b"
        stroke="#d97706"
        strokeWidth="1.5"
      />
      <path
        d="M28 17L29.8 20.5H34L30.5 23L31.8 27L28 24.5L24.2 27L25.5 23L22 20.5H26.2Z"
        fill="white"
      />
      <rect x="22" y="42" width="12" height="4" rx="2" fill="#f59e0b" />
      <rect x="18" y="46" width="20" height="5" rx="2.5" fill="#d97706" />
      <path
        d="M22 46L16 54"
        stroke="#ef4444"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M34 46L40 54"
        stroke="#3b82f6"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Feature card data
// -----------------------------------------------------------------------------
const FEATURES = [
  {
    id: "create",
    icon: <CreateIcon />,
    title: "Create",
    desc: "Build quizzes with custom questions and timed rounds.",
    cta: "Go to Quiz Builder",
    href: "/create-quiz",
    cardClass: "lobby-feature-pink",
    glowClass: "lobby-glow-pink",
    btnClass: "btn-cartoon-pink",
  },
  {
    id: "host",
    icon: <HostIcon />,
    title: "Host",
    desc: "Start sessions and manage classroom flow in real time.",
    cta: "Open Teacher Dashboard",
    href: "/teacher/dashboard",
    cardClass: "lobby-feature-blue",
    glowClass: "lobby-glow-blue",
    btnClass: "btn-cartoon-blue",
  },
  {
    id: "compete",
    icon: <CompeteIcon />,
    title: "Compete",
    desc: "Students join with a code and climb the live leaderboard.",
    cta: "Enter Join Page",
    href: "/join-quiz",
    cardClass: "lobby-feature-amber",
    glowClass: "lobby-glow-amber",
    btnClass: "btn-cartoon-amber",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      damping: 16,
      stiffness: 100,
      delay: 0.25 + i * 0.12,
    },
  }),
};

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------
export default function Home() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      if (user.role === "admin") router.push("/admin/dashboard");
      else if (user.role === "teacher") router.push("/teacher/dashboard");
      else router.push("/student/dashboard");
    }
  }, [user, router]);

  if (user) return null;

  return (
    <div className="space-bg min-h-[100dvh] overflow-y-auto flex flex-col">
      {/* animated gradient blobs */}
      <motion.div
        className="fixed -z-10 top-[-25%] left-[-15%] w-[700px] h-[700px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(147,51,234,0.5) 0%, transparent 70%)",
        }}
        animate={{ x: [0, 60, 0], y: [0, -50, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="fixed -z-10 top-[10%] right-[-18%] w-[550px] h-[550px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(236,72,153,0.35) 0%, transparent 70%)",
        }}
        animate={{ x: [0, -50, 0], y: [0, 60, 0] }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
      />
      <motion.div
        className="fixed -z-10 bottom-[-15%] left-[25%] w-[650px] h-[650px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(37,99,235,0.45) 0%, transparent 70%)",
        }}
        animate={{ x: [0, 40, 0], y: [0, -35, 0] }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 6,
        }}
      />

      {/* stars + shooting stars */}
      <div className="fixed inset-0 z-[1] pointer-events-none">
        <Stars />
        <ShootingStar delay={1} positionClass="top-[8%] left-[15%]" />
        <ShootingStar delay={5} positionClass="top-[22%] left-[62%]" />
        <ShootingStar delay={9} positionClass="top-[35%] left-[78%]" />
      </div>

      {/* planets */}
      <motion.div
        className="fixed z-[1] top-[12%] right-[7%] w-12 md:w-16 opacity-50 pointer-events-none"
        animate={{ y: [0, -12, 0], rotate: [0, 360] }}
        transition={{
          y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 30, repeat: Infinity, ease: "linear" },
        }}
      >
        <MiniPlanet color1="#f9a8d4" color2="#be185d" ringColor="#f472b6" />
      </motion.div>
      <motion.div
        className="fixed z-[1] bottom-[25%] left-[4%] w-9 md:w-12 opacity-40 pointer-events-none"
        animate={{ y: [0, -10, 0], rotate: [0, -360] }}
        transition={{
          y: { duration: 8, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 40, repeat: Infinity, ease: "linear" },
        }}
      >
        <MiniPlanet color1="#93c5fd" color2="#1d4ed8" ringColor="#60a5fa" />
      </motion.div>

      {/* -- Main Layout: flex column, h-screen -- */}
      <div className="relative z-10 h-full flex flex-col">
        {/* -- Top Bar -- */}
        <motion.header
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-shrink-0 flex items-center justify-between px-7 sm:px-12 lg:px-16 py-3"
        >
          <div />
          <Link href="/login">
            <motion.div
              whileHover={{ scale: 1.08, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="btn-cartoon btn-cartoon-outline px-4 py-1.5 text-sm rounded-2xl"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-300" />
              Login
            </motion.div>
          </Link>
        </motion.header>

        {/* -- Content: flex-1, centered -- */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 pb-4 pt-4">
          <div className="flex flex-col items-center justify-center gap-4 sm:gap-5 max-w-4xl mx-auto w-full">
            {/* -- Logo -- */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.6,
                type: "spring",
                damping: 11,
                stiffness: 90,
              }}
              className="relative"
            >
              <SparkleRing />
              <div className="relative flex items-center gap-2 sm:gap-3 px-6 sm:px-9 py-2.5 sm:py-3 rounded-[1.8rem] lobby-logo-frame">
                <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />
                <span className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-wide lobby-logo-quiz">
                  QUIZ
                </span>
                <motion.div
                  animate={{ rotate: [0, -12, 0], y: [0, -6, 0] }}
                  transition={{
                    duration: 2.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 logo-rocket-shadow"
                >
                  <CartoonRocket className="w-full h-full" />
                </motion.div>
                <span className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-wide lobby-logo-master">
                  MASTER
                </span>
              </div>
            </motion.div>

            {/* -- Heading -- */}
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="title-cartoon mt-2 sm:mt-4 text-3xl sm:text-4xl md:text-[3rem] lg:text-[3.5rem] leading-[1.15] sm:leading-[1.2] text-center max-w-3xl flex flex-col gap-1 sm:gap-2"
            >
              <span className="text-white">Interactive Quizzes</span>
              <span className="hero-gradient-text">With Real Energy</span>
            </motion.h1>

            {/* -- Subtitle -- */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="text-purple-100 text-sm sm:text-base lg:text-lg text-center max-w-2xl leading-relaxed font-body"
            >
              Create live quiz sessions, invite students instantly, and run
              exciting rounds with fast scoring and live leaderboards.
            </motion.p>
          </div>

          {/* -- CTA Buttons -- */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6"
          >
            <Link href="/register">
              <motion.div
                whileHover={{ scale: 1.06, y: -3 }}
                whileTap={{ scale: 0.95 }}
                className="btn-cartoon btn-cartoon-pink px-8 py-3.5 text-base sm:text-lg font-bold rounded-2xl inline-flex items-center justify-center"
              >
                Create Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </motion.div>
            </Link>
            <Link href="/join-quiz">
              <motion.div
                whileHover={{ scale: 1.06, y: -3 }}
                whileTap={{ scale: 0.95 }}
                className="group btn-cartoon btn-cartoon-outline px-8 py-3.5 text-base sm:text-lg font-bold rounded-2xl inline-flex items-center justify-center relative overflow-hidden border-2 border-cyan-400/40 hover:border-cyan-300/70 hover:shadow-[0_0_28px_rgba(34,211,238,0.3)] transition-all duration-300"
              >
                <motion.div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-400/10 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Play className="w-5 h-5 fill-current mr-2.5 relative z-10 group-hover:scale-110 transition-transform" />
                <span className="relative z-10">Play Quiz</span>
                <ArrowRight className="w-5 h-5 ml-2 relative z-10 group-hover:translate-x-1 transition-transform" />
              </motion.div>
            </Link>
          </motion.div>

          {/* -- Feature Cards -- */}
          <div className="w-full max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8 sm:mt-10">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.id}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className={`group relative rounded-2xl p-4 sm:p-5 flex flex-col gap-2 transition-all duration-300 overflow-hidden lobby-feature-card ${f.cardClass}`}
              >
                <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-white/15 to-transparent rounded-full" />
                <div
                  className={`absolute top-0 right-0 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${f.glowClass}`}
                />

                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{
                      rotate: [-6, 6, -6, 0],
                      scale: 1.1,
                      transition: { duration: 0.4 },
                    }}
                    className="flex-shrink-0 icon-shadow-sm"
                  >
                    {f.icon}
                  </motion.div>
                  <h3 className="title-cartoon text-lg sm:text-xl text-white font-display">
                    {f.title}
                  </h3>
                </div>

                <p className="text-white/60 text-xs sm:text-sm leading-relaxed font-body">
                  {f.desc}
                </p>

                <Link href={f.href}>
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    className={`w-full btn-cartoon ${f.btnClass} py-2 px-3 text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 whitespace-nowrap normal-case tracking-[0.02em]`}
                  >
                    {f.cta}
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
