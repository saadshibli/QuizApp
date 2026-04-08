"use client";

import { useId } from "react";
import { motion } from "framer-motion";

export function SparkleRing() {
  const sparkles = [
    { angle: 0, dist: 52, size: 6, delay: 0 },
    { angle: 45, dist: 56, size: 5, delay: 0.3 },
    { angle: 90, dist: 50, size: 7, delay: 0.6 },
    { angle: 135, dist: 54, size: 4, delay: 0.9 },
    { angle: 180, dist: 52, size: 6, delay: 1.2 },
    { angle: 225, dist: 56, size: 5, delay: 0.2 },
    { angle: 270, dist: 50, size: 7, delay: 0.7 },
    { angle: 315, dist: 54, size: 4, delay: 1.0 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none">
      {sparkles.map((s, i) => {
        const x = 50 + s.dist * Math.cos((s.angle * Math.PI) / 180);
        const y = 50 + s.dist * Math.sin((s.angle * Math.PI) / 180);
        return (
          <motion.div
            key={i}
            className="absolute rounded-full z-0"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: s.size,
              height: s.size,
              background: i % 2 === 0 ? "#fde68a" : "#c4b5fd",
              boxShadow: `0 0 ${s.size * 2}px ${i % 2 === 0 ? "#fbbf24" : "#a78bfa"}`,
            }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.3, 0.5] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              delay: s.delay,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
}

export function CartoonRocket({ className }: { className?: string }) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  return (
    <svg viewBox="0 0 100 130" className={className} fill="none" aria-hidden>
      <defs>
        <linearGradient id={id("body")} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="35%" stopColor="#e0e7ff" />
          <stop offset="100%" stopColor="#c7d2fe" />
        </linearGradient>
        <linearGradient id={id("nose")} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
        <linearGradient id={id("finL")} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id={id("finR")} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id={id("fOut")} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="60%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
        <linearGradient id={id("fIn")} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <radialGradient id={id("win")} cx="40%" cy="35%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="50%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#0369a1" />
        </radialGradient>
      </defs>
      <path
        d="M35 90 Q32 115 28 120 Q40 108 50 125 Q60 108 72 120 Q68 115 65 90Z"
        fill={`url(#${id("fOut")})`}
        opacity="0.9"
      />
      <path
        d="M40 90 Q38 108 36 112 Q44 103 50 118 Q56 103 64 112 Q62 108 60 90Z"
        fill={`url(#${id("fIn")})`}
      />
      <path
        d="M44 90 Q43 102 42 106 Q47 100 50 110 Q53 100 58 106 Q57 102 56 90Z"
        fill="white"
        opacity="0.8"
      />
      <path
        d="M28 68L8 92L10 82L26 80Z"
        fill={`url(#${id("finL")})`}
        stroke="#3730a3"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M72 68L92 92L90 82L74 80Z"
        fill={`url(#${id("finR")})`}
        stroke="#3730a3"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M50 6C64 18 74 38 74 62V82C74 86 70 90 66 90H34C30 90 26 86 26 82V62C26 38 36 18 50 6Z"
        fill={`url(#${id("body")})`}
        stroke="#6366f1"
        strokeWidth="3"
      />
      <path
        d="M34 24C38 16 44 10 50 6C44 12 39 22 36 36L34 24Z"
        fill="white"
        opacity="0.4"
      />
      <path
        d="M50 6C58 14 66 28 68 40L32 40C34 28 42 14 50 6Z"
        fill={`url(#${id("nose")})`}
        stroke="#dc2626"
        strokeWidth="2.5"
      />
      <rect
        x="26"
        y="70"
        width="48"
        height="10"
        rx="2"
        fill="#6366f1"
        opacity="0.25"
      />
      <circle cx="34" cy="75" r="2" fill="#a5b4fc" opacity="0.5" />
      <circle cx="66" cy="75" r="2" fill="#a5b4fc" opacity="0.5" />
      <circle
        cx="50"
        cy="52"
        r="14"
        fill="#1e3a5f"
        stroke="#4338ca"
        strokeWidth="3.5"
      />
      <circle cx="50" cy="52" r="10" fill={`url(#${id("win")})`} />
      <ellipse cx="46" cy="48" rx="4" ry="3.5" fill="white" opacity="0.55" />
      <circle cx="55" cy="56" r="1.5" fill="white" opacity="0.3" />
    </svg>
  );
}

function StarSparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="white" aria-hidden>
      <path d="M12 0L14 10L24 8.5L16 14L20 24L12 18L4 24L8 14L0 8.5L10 10Z" />
    </svg>
  );
}

const STAR_DATA = [
  { x: "4%", y: "6%", d: 0, sz: "w-3 h-3" },
  { x: "15%", y: "18%", d: 0.7, sz: "w-2 h-2" },
  { x: "28%", y: "8%", d: 1.4, sz: "w-3 h-3" },
  { x: "48%", y: "3%", d: 0.3, sz: "w-2 h-2" },
  { x: "63%", y: "12%", d: 1.9, sz: "w-3 h-3" },
  { x: "77%", y: "5%", d: 0.9, sz: "w-2 h-2" },
  { x: "90%", y: "16%", d: 1.2, sz: "w-3 h-3" },
  { x: "94%", y: "42%", d: 2.4, sz: "w-2 h-2" },
  { x: "3%", y: "50%", d: 2.0, sz: "w-2 h-2" },
  { x: "20%", y: "55%", d: 3.1, sz: "w-3 h-3" },
  { x: "72%", y: "60%", d: 0.5, sz: "w-2 h-2" },
  { x: "87%", y: "72%", d: 2.8, sz: "w-3 h-3" },
  { x: "38%", y: "82%", d: 3.5, sz: "w-2 h-2" },
  { x: "96%", y: "58%", d: 1.5, sz: "w-2 h-2" },
];

export function Stars() {
  return (
    <>
      {STAR_DATA.map((s, i) => (
        <div
          key={i}
          className={`absolute ${s.sz} pointer-events-none z-0 animate-star-twinkle`}
          style={{
            left: s.x,
            top: s.y,
            animationDelay: `${s.d}s`,
            animationDuration: `${2 + i * 0.25}s`,
          }}
        >
          <StarSparkle className="w-full h-full opacity-80" />
        </div>
      ))}
    </>
  );
}

export function ShootingStar({
  delay,
  positionClass,
}: {
  delay: number;
  positionClass: string;
}) {
  return (
    <div
      className={`absolute w-1.5 h-1.5 rounded-full pointer-events-none z-0 shooting-star-dot animate-shooting-star ${positionClass}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="absolute top-0 right-0 w-20 h-[2px] shooting-star-trail" />
    </div>
  );
}

export function CloudShape({
  className,
  fill = "#e9d5ff",
  stroke = "#c084fc",
  id = "cloud",
}: {
  className?: string;
  fill?: string;
  stroke?: string;
  id?: string;
}) {
  return (
    <svg viewBox="0 0 340 140" className={className} fill="none" aria-hidden>
      <defs>
        <radialGradient id={`${id}-g1`} cx="40%" cy="30%">
          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-g2`} cx="50%" cy="40%">
          <stop offset="0%" stopColor="white" stopOpacity="0.2" />
          <stop offset="80%" stopColor={fill} stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-blur`}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
        <filter id={`${id}-soft`}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" />
        </filter>
      </defs>
      {/* Soft shadow beneath */}
      <ellipse
        cx="170"
        cy="118"
        rx="140"
        ry="16"
        fill={fill}
        opacity="0.15"
        filter={`url(#${id}-blur)`}
      />
      {/* Main cloud body — layered puffs */}
      <ellipse
        cx="88"
        cy="88"
        rx="58"
        ry="38"
        fill={fill}
        opacity="0.85"
        filter={`url(#${id}-soft)`}
      />
      <ellipse cx="155" cy="70" rx="72" ry="48" fill={fill} opacity="0.9" />
      <ellipse
        cx="235"
        cy="82"
        rx="62"
        ry="40"
        fill={fill}
        opacity="0.85"
        filter={`url(#${id}-soft)`}
      />
      <ellipse cx="120" cy="60" rx="50" ry="38" fill={fill} opacity="0.88" />
      <ellipse cx="200" cy="58" rx="55" ry="42" fill={fill} opacity="0.88" />
      {/* Top puffs for fluffy look */}
      <ellipse cx="130" cy="44" rx="38" ry="30" fill={fill} opacity="0.8" />
      <ellipse cx="180" cy="38" rx="42" ry="32" fill={fill} opacity="0.82" />
      <ellipse cx="220" cy="50" rx="34" ry="26" fill={fill} opacity="0.75" />
      {/* Flat bottom to unify puffs */}
      <rect
        x="48"
        y="90"
        width="244"
        height="30"
        rx="15"
        fill={fill}
        opacity="0.9"
      />
      {/* Highlight gradients on top puffs */}
      <ellipse cx="140" cy="50" rx="50" ry="32" fill={`url(#${id}-g1)`} />
      <ellipse cx="195" cy="44" rx="45" ry="28" fill={`url(#${id}-g2)`} />
      <ellipse cx="105" cy="56" rx="35" ry="24" fill={`url(#${id}-g2)`} />
      {/* Subtle inner glow on top */}
      <ellipse cx="160" cy="42" rx="60" ry="20" fill="white" opacity="0.08" />
      {/* Soft outline for depth */}
      <ellipse
        cx="155"
        cy="70"
        rx="72"
        ry="48"
        fill="none"
        stroke={stroke}
        strokeWidth="1"
        opacity="0.25"
      />
    </svg>
  );
}

export function MiniPlanet({
  color1,
  color2,
  ringColor,
  className,
}: {
  color1: string;
  color2: string;
  ringColor: string;
  className?: string;
}) {
  const uid = useId();
  const gId = `${uid}-pl`;
  return (
    <svg viewBox="0 0 60 60" className={className} fill="none" aria-hidden>
      <defs>
        <radialGradient id={gId} cx="35%" cy="30%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </radialGradient>
      </defs>
      <circle cx="30" cy="30" r="18" fill={`url(#${gId})`} />
      <ellipse
        cx="30"
        cy="30"
        rx="28"
        ry="7"
        fill="none"
        stroke={ringColor}
        strokeWidth="2.5"
        opacity="0.6"
        transform="rotate(-15 30 30)"
      />
      <circle cx="24" cy="24" r="4" fill="white" opacity="0.2" />
    </svg>
  );
}

export default function SpaceBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Background Animated Blobs — CSS animations for performance */}
      <div
        className="absolute top-[-25%] left-[-15%] w-[700px] h-[700px] rounded-full will-change-transform animate-blob-1"
        style={{
          background:
            "radial-gradient(circle, rgba(147,51,234,0.45) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-[10%] right-[-18%] w-[550px] h-[550px] rounded-full will-change-transform animate-blob-2"
        style={{
          background:
            "radial-gradient(circle, rgba(236,72,153,0.3) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-[-15%] left-[25%] w-[650px] h-[650px] rounded-full will-change-transform animate-blob-3"
        style={{
          background:
            "radial-gradient(circle, rgba(37,99,235,0.35) 0%, transparent 70%)",
        }}
      />

      <Stars />
      <ShootingStar delay={2} positionClass="top-[15%] left-[20%]" />
      <ShootingStar delay={6} positionClass="top-[35%] left-[65%]" />
      <ShootingStar delay={9} positionClass="top-[60%] left-[80%]" />

      {/* Floating Elements — CSS animations */}
      <div className="absolute top-[12%] right-[10%] w-16 md:w-24 opacity-60 will-change-transform animate-float-1">
        <MiniPlanet color1="#c084fc" color2="#7e22ce" ringColor="#e879f9" />
      </div>

      <div className="absolute bottom-[20%] left-[5%] w-12 md:w-16 opacity-50 will-change-transform animate-float-2">
        <MiniPlanet color1="#38bdf8" color2="#0369a1" ringColor="#7dd3fc" />
      </div>
    </div>
  );
}
