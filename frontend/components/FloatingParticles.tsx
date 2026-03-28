"use client";

import { motion } from "framer-motion";

function QuestionMark({ x, y, delay, size }: { x: string; y: string; delay: number; size: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none z-0 font-black select-none"
      style={{ left: x, top: y, fontSize: size, color: "rgba(168,130,255,0.15)" }}
      animate={{ y: [0, -20, 0], rotate: [-10, 15, -10], opacity: [0.15, 0.3, 0.15] }}
      transition={{ duration: 5 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    >
      ?
    </motion.div>
  );
}

function StarParticle({ x, y, delay, size }: { x: string; y: string; delay: number; size: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none z-0"
      style={{ left: x, top: y }}
      animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.1, 0.4, 0.1], rotate: [0, 180, 360] }}
      transition={{ duration: 4 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="rgba(251,191,36,0.25)">
        <path d="M12 0L14.59 8.41L23 9.27L16.84 14.14L18.94 23L12 18.77L5.06 23L7.16 14.14L1 9.27L9.41 8.41Z" />
      </svg>
    </motion.div>
  );
}

function SparkleParticle({ x, y, delay, size }: { x: string; y: string; delay: number; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none z-0"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        background: `radial-gradient(circle, rgba(34,211,238,0.4), transparent)`,
      }}
      animate={{ scale: [0, 1.5, 0], opacity: [0, 0.6, 0] }}
      transition={{ duration: 3 + delay * 0.5, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

const QUIZ_PARTICLES = [
  { type: "question", x: "5%", y: "10%", delay: 0, size: 48 },
  { type: "star", x: "88%", y: "8%", delay: 1.2, size: 28 },
  { type: "question", x: "92%", y: "35%", delay: 2, size: 36 },
  { type: "star", x: "12%", y: "65%", delay: 0.8, size: 22 },
  { type: "sparkle", x: "30%", y: "5%", delay: 1.5, size: 8 },
  { type: "sparkle", x: "70%", y: "85%", delay: 0.3, size: 10 },
  { type: "question", x: "78%", y: "70%", delay: 3, size: 42 },
  { type: "star", x: "45%", y: "90%", delay: 2.5, size: 20 },
  { type: "sparkle", x: "55%", y: "15%", delay: 1, size: 6 },
  { type: "star", x: "20%", y: "30%", delay: 0.5, size: 18 },
  { type: "sparkle", x: "85%", y: "55%", delay: 2.2, size: 12 },
  { type: "question", x: "35%", y: "78%", delay: 1.8, size: 30 },
];

const WAITING_PARTICLES = [
  { type: "sparkle", x: "8%", y: "12%", delay: 0, size: 10 },
  { type: "sparkle", x: "25%", y: "6%", delay: 0.8, size: 8 },
  { type: "sparkle", x: "72%", y: "18%", delay: 1.5, size: 12 },
  { type: "sparkle", x: "90%", y: "45%", delay: 0.3, size: 6 },
  { type: "star", x: "15%", y: "80%", delay: 2, size: 20 },
  { type: "star", x: "60%", y: "90%", delay: 1, size: 24 },
  { type: "sparkle", x: "45%", y: "5%", delay: 2.5, size: 14 },
  { type: "sparkle", x: "80%", y: "75%", delay: 1.2, size: 10 },
  { type: "star", x: "35%", y: "55%", delay: 0.6, size: 16 },
  { type: "sparkle", x: "50%", y: "40%", delay: 3, size: 8 },
];

export default function FloatingParticles({ variant = "quiz" }: { variant?: "quiz" | "waiting" }) {
  const particles = variant === "quiz" ? QUIZ_PARTICLES : WAITING_PARTICLES;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {particles.map((p, i) => {
        switch (p.type) {
          case "question":
            return <QuestionMark key={i} x={p.x} y={p.y} delay={p.delay} size={p.size} />;
          case "star":
            return <StarParticle key={i} x={p.x} y={p.y} delay={p.delay} size={p.size} />;
          case "sparkle":
            return <SparkleParticle key={i} x={p.x} y={p.y} delay={p.delay} size={p.size} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
