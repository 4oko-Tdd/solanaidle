export { Colors } from "./lib/theme";

export const Shadows = {
  sm:    "0 1px 3px rgba(0,0,0,0.4)",
  md:    "0 4px 12px rgba(0,0,0,0.5)",
  lg:    "0 8px 24px rgba(0,0,0,0.6)",

  glowGreen:  "0 0 20px rgba(20,241,149,0.15), 0 0 40px rgba(20,241,149,0.05)",
  glowPurple: "0 0 20px rgba(153,69,255,0.15), 0 0 40px rgba(153,69,255,0.05)",
  glowRed:    "0 0 20px rgba(255,51,102,0.2), 0 0 40px rgba(255,51,102,0.05)",
  glowCyan:   "0 0 20px rgba(0,212,255,0.15), 0 0 40px rgba(0,212,255,0.05)",
  glowAmber:  "0 0 20px rgba(255,184,0,0.15), 0 0 40px rgba(255,184,0,0.05)",
} as const;

export const FontSize = {
  badge: 11,
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  "2xl": 24,
} as const;

export const LetterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 1,
  wider: 2,
  caps: 2,
} as const;
