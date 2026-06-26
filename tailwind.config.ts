import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: "#fbf7ef",
        pearl: "#fffdf8",
        blush: "#f4d8d2",
        petal: "#efd1d6",
        champagne: "#e8d2a6",
        linen: "#efe5d3",
        charcoal: "#2d2a27",
        ink: "#1f1d1a",
        gold: "#b28a44",
        honey: "#d6ad63",
        sage: "#81937b",
        eucalyptus: "#66785f",
        rose: "#a85d63",
        claret: "#7b3f46",
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 20px 70px rgba(45, 42, 39, 0.10)",
        elevated: "0 24px 80px rgba(31, 29, 26, 0.14)",
        ring: "0 0 0 1px rgba(178, 138, 68, 0.18)",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
        30: "7.5rem",
      },
    },
  },
  plugins: [animate],
};

export default config;
