import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ox: {
          bg: "#0D0705",
          surface: "#170F0C",
          card: "#251D1A",
          elevated: "#302A28",
          border: "#3D2E24",
          "border-active": "#5C3A1E",
          cyan: "#F28C18",
          "cyan-dim": "#AD6A1F",
          purple: "#D63F5A",
          "purple-dim": "#A03048",
          safe: "#00e68a",
          caution: "#ffb224",
          danger: "#ff4757",
          "text-primary": "#EDE8E3",
          "text-secondary": "#9E9590",
          "text-muted": "#7A746E",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ['"Clash Display"', "var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in": "ox-fade-in 0.4s ease-out",
        "slide-up": "ox-slide-up 0.4s ease-out",
        "score-fill": "ox-ring-fill 1s ease-out forwards",
        "pulse-dot": "ox-pulse-dot 2s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
