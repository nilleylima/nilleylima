import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#061816",
          900: "#0B3D3A",
          800: "#0F4F4A",
          700: "#14635C",
        },
        mint: {
          50: "#F2FBF8",
          100: "#D8F3EA",
          200: "#B5E6D6",
          400: "#4DB89A",
          500: "#1F9B7A",
          600: "#0F766E",
        },
        sand: {
          50: "#F7F5F0",
          100: "#EFEBE3",
          200: "#E2DBCF",
          500: "#9C8F7A",
        },
        coral: {
          500: "#C45C3E",
          600: "#A84830",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 50px -28px rgba(11, 61, 58, 0.45)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(12px,-10px,0) scale(1.04)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "0.9" },
        },
      },
      animation: {
        rise: "rise 0.7s ease-out both",
        "rise-delay": "rise 0.85s ease-out 0.12s both",
        "rise-late": "rise 1s ease-out 0.24s both",
        drift: "drift 14s ease-in-out infinite",
        "pulse-soft": "pulseSoft 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
