// All hex values verified against web app CSS variables and tailwind.config
export const Colors = {
  // Backgrounds
  background: "#0a0a0a",
  surface: "#111111",
  surfaceElevated: "#1a1a27",

  // Borders
  border: "#1f1f2e",
  borderSubtle: "rgba(255,255,255,0.06)",
  borderMedium: "rgba(255,255,255,0.1)",

  // Text
  textPrimary: "rgba(240,247,255,0.98)",
  textSecondary: "rgba(255,255,255,0.70)",
  textMuted: "rgba(135,158,185,0.85)",
  textDisabled: "rgba(255,255,255,0.30)",

  // Neon accents — identical to web
  neonPurple: "#9945FF",
  neonGreen: "#14F195",
  neonCyan: "#00D4FF",
  neonRed: "#FF3366",
  neonAmber: "#FFB800",

  // Semantic
  primary: "#9945FF",
  success: "#14F195",
  warning: "#FFB800",
  danger: "#FF3366",
  info: "#00D4FF",
} as const;
