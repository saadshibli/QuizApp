import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary space palette
        primary: "#7c3aed",
        "primary-light": "#8b5cf6",
        "primary-lighter": "#a78bfa",

        // Secondary and surfaces (space depth)
        secondary: "#1c1836",
        "secondary-light": "#2d1f5e",
        accent: "#06b6d4",
        "accent-light": "#22d3ee",

        // Deep space backgrounds
        surface: "#151229",
        "surface-light": "#1f1741",
        deep: "#0d0b1a",

        // Neon accents for space theme
        neon: {
          pink: "#ec4899",
          purple: "#d946ef",
          cyan: "#06b6d4",
          blue: "#3b82f6",
          green: "#10b981",
          amber: "#f59e0b",
          orange: "#f97316",
          red: "#ef4444",
        },

        // Text colors for dark theme
        "text-primary": "#f0eeff",
        "text-secondary": "#a8a3c7",
        "text-muted": "#6b6590",
      },
      backgroundImage: {
        "space-gradient":
          "linear-gradient(170deg, #0d0b1a 0%, #151229 20%, #1c1836 40%, #201a45 60%, #181335 80%, #0d0b1a 100%)",
        "cosmic-radial":
          "radial-gradient(ellipse 80% 100% at 50% 100%, #7c3aed 0%, #1c1836 80%)",
        "neon-glow": "radial-gradient(circle, #ec4899 0%, transparent 70%)",
      },
      boxShadow: {
        "glow-purple":
          "0 0 20px rgba(124, 58, 237, 0.5), 0 0 40px rgba(124, 58, 237, 0.25)",
        "glow-pink":
          "0 0 20px rgba(236, 72, 153, 0.5), 0 0 40px rgba(236, 72, 153, 0.25)",
        "glow-cyan":
          "0 0 20px rgba(6, 182, 212, 0.5), 0 0 40px rgba(6, 182, 212, 0.25)",
        "glow-primary":
          "0 0 30px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.3)",
      },
      backdropBlur: {
        glass: "20px",
        "glass-light": "12px",
      },
    },
  },
  plugins: [],
};
export default config;
