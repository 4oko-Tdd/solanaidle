/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
    "./providers/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "neon-green": "#14F195",
        "neon-amber": "#ffb800",
        "neon-cyan": "#00d4ff",
        "neon-purple": "#9945ff",
        "neon-red": "#FF3366",
        terminal: "#0a0a0a",
        surface: "#111111",
      },
      fontFamily: {
        // sans = semibold by default (matches web: body font-weight 600)
        sans:            ["Rajdhani_600SemiBold", "system-ui"],
        "sans-regular":  ["Rajdhani_400Regular", "system-ui"],
        "sans-semibold": ["Rajdhani_600SemiBold", "system-ui"],
        "sans-bold":     ["Rajdhani_700Bold", "system-ui"],

        // display = Orbitron bold (headings)
        display:         ["Orbitron_700Bold", "system-ui"],
        "display-black": ["Orbitron_900Black", "system-ui"],

        // mono = Orbitron (buttons, badges, scores)
        mono:            ["Orbitron_400Regular", "system-ui"],
        "mono-bold":     ["Orbitron_700Bold", "system-ui"],
      },
    },
  },
  plugins: [],
};
