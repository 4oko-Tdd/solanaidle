/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "neon-green": "#00ff87",
        "neon-amber": "#ffb800",
        "neon-cyan": "#00d4ff",
        "neon-purple": "#9945ff",
        "neon-red": "#ff4444",
        terminal: "#0a0a0a",
        surface: "#111111",
      },
    },
  },
  plugins: [],
};
