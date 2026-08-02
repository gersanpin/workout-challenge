import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f5f2",
          100: "#ebe8e0",
          200: "#d6d0c2",
          300: "#b8ae99",
          400: "#9a8c72",
          500: "#7f7259",
          600: "#665a47",
          700: "#51483a",
          800: "#453e34",
          900: "#3c362e",
          950: "#201c17",
        },
        clay: {
          400: "#c47a4a",
          500: "#a85f35",
          600: "#8c4b2a",
        },
        slate: {
          arch: "#2c3338",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
