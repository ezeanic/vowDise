import type { Config } from "tailwindcss";

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
        blush: "#f4d8d2",
        champagne: "#e8d2a6",
        charcoal: "#2d2a27",
        gold: "#b28a44",
        sage: "#81937b",
        rose: "#a85d63",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 20px 70px rgba(45, 42, 39, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
