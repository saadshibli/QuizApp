"use client";

import { motion } from "framer-motion";

export function MiniMascot({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
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
