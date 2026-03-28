"use client";

import { motion } from "framer-motion";

interface QuizMascotProps {
  size?: number;
  animate?: boolean;
  className?: string;
}

export default function QuizMascot({ size = 120, animate = true, className = "" }: QuizMascotProps) {
  const Wrapper = animate ? motion.div : "div";
  const animateProps = animate
    ? {
        animate: { y: [0, -8, 0], rotate: [0, 3, -3, 0] },
        transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const },
      }
    : {};

  return (
    <Wrapper className={`inline-block ${className}`} {...animateProps}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="owlBody" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#7c3aed" />
          </radialGradient>
          <radialGradient id="owlBelly" cx="50%" cy="30%">
            <stop offset="0%" stopColor="#ede9fe" />
            <stop offset="100%" stopColor="#c4b5fd" />
          </radialGradient>
          <linearGradient id="hat" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        {/* Body */}
        <ellipse cx="100" cy="125" rx="55" ry="52" fill="url(#owlBody)" />
        {/* Belly */}
        <ellipse cx="100" cy="138" rx="35" ry="32" fill="url(#owlBelly)" opacity="0.85" />

        {/* Left ear tuft */}
        <path d="M55 82 L62 55 L75 80Z" fill="#9333ea" />
        <path d="M58 78 L64 60 L72 78Z" fill="#c084fc" />
        {/* Right ear tuft */}
        <path d="M145 82 L138 55 L125 80Z" fill="#9333ea" />
        <path d="M142 78 L136 60 L128 78Z" fill="#c084fc" />

        {/* Head */}
        <circle cx="100" cy="90" r="40" fill="url(#owlBody)" />

        {/* Left eye */}
        <circle cx="82" cy="88" r="16" fill="white" />
        <circle cx="84" cy="86" r="10" fill="#1e1b4b" />
        <circle cx="87" cy="83" r="4" fill="white" />
        <circle cx="80" cy="90" r="2" fill="white" opacity="0.5" />

        {/* Right eye */}
        <circle cx="118" cy="88" r="16" fill="white" />
        <circle cx="120" cy="86" r="10" fill="#1e1b4b" />
        <circle cx="123" cy="83" r="4" fill="white" />
        <circle cx="116" cy="90" r="2" fill="white" opacity="0.5" />

        {/* Beak */}
        <path d="M95 98 L100 108 L105 98Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />

        {/* Graduation cap */}
        <rect x="68" y="55" width="64" height="6" rx="1" fill="url(#hat)" stroke="#d97706" strokeWidth="1.5" />
        <path d="M75 55 L100 35 L125 55Z" fill="url(#hat)" stroke="#d97706" strokeWidth="1.5" />
        <circle cx="100" cy="35" r="4" fill="#ef4444" />

        {/* Left wing */}
        <path
          d="M48 115 C30 120, 25 145, 45 155 L55 140Z"
          fill="#9333ea"
          opacity="0.8"
        />
        {/* Right wing — holding quiz card */}
        <path
          d="M152 115 C170 120, 175 145, 155 155 L145 140Z"
          fill="#9333ea"
          opacity="0.8"
        />

        {/* Quiz card in right wing */}
        <rect x="148" y="125" width="28" height="36" rx="4" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
        <rect x="153" y="131" width="18" height="3" rx="1" fill="#a855f7" />
        <rect x="153" y="137" width="14" height="2" rx="1" fill="#d8b4fe" />
        <rect x="153" y="142" width="16" height="2" rx="1" fill="#d8b4fe" />
        <circle cx="157" cy="152" r="3" fill="#22d3ee" />
        <circle cx="165" cy="152" r="3" fill="#f472b6" />

        {/* Feet */}
        <ellipse cx="85" cy="175" rx="12" ry="5" fill="#f59e0b" />
        <ellipse cx="115" cy="175" rx="12" ry="5" fill="#f59e0b" />

        {/* Blush spots */}
        <circle cx="68" cy="100" r="6" fill="#f9a8d4" opacity="0.4" />
        <circle cx="132" cy="100" r="6" fill="#f9a8d4" opacity="0.4" />
      </svg>
    </Wrapper>
  );
}

export function MiniMascot({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <motion.div
      className={`inline-block ${className}`}
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="miniBody" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#7c3aed" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="62" rx="28" ry="26" fill="url(#miniBody)" />
        <circle cx="50" cy="42" r="22" fill="url(#miniBody)" />
        <circle cx="40" cy="40" r="8" fill="white" />
        <circle cx="42" cy="39" r="5" fill="#1e1b4b" />
        <circle cx="43" cy="37" r="2" fill="white" />
        <circle cx="60" cy="40" r="8" fill="white" />
        <circle cx="62" cy="39" r="5" fill="#1e1b4b" />
        <circle cx="63" cy="37" r="2" fill="white" />
        <path d="M46 48 L50 54 L54 48Z" fill="#f59e0b" />
        <path d="M32 25 L38 14 L44 28Z" fill="#9333ea" />
        <path d="M68 25 L62 14 L56 28Z" fill="#9333ea" />
        <circle cx="32" cy="48" r="4" fill="#f9a8d4" opacity="0.4" />
        <circle cx="68" cy="48" r="4" fill="#f9a8d4" opacity="0.4" />
      </svg>
    </motion.div>
  );
}
