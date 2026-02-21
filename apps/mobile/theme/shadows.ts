// Use CSS boxShadow syntax (RN 0.76+ New Architecture).
// Web-faithful values — do NOT use elevation or legacy shadow props.
export const Shadows = {
  sm:    "0 1px 3px rgba(0,0,0,0.4)",
  md:    "0 4px 12px rgba(0,0,0,0.5)",
  lg:    "0 8px 24px rgba(0,0,0,0.6)",

  // Neon glow effects — match web exactly
  glowGreen:  "0 0 20px rgba(20,241,149,0.15), 0 0 40px rgba(20,241,149,0.05)",
  glowPurple: "0 0 20px rgba(153,69,255,0.15), 0 0 40px rgba(153,69,255,0.05)",
  glowRed:    "0 0 20px rgba(255,51,102,0.2), 0 0 40px rgba(255,51,102,0.05)",
  glowCyan:   "0 0 20px rgba(0,212,255,0.15), 0 0 40px rgba(0,212,255,0.05)",
  glowAmber:  "0 0 20px rgba(255,184,0,0.15), 0 0 40px rgba(255,184,0,0.05)",
} as const;
