// Font family names must match the exact string passed to useFonts()
export const FontFamily = {
  sansRegular: "Rajdhani_400Regular",
  sansSemibold: "Rajdhani_600SemiBold",
  sansBold: "Rajdhani_700Bold",
  displayBold: "Orbitron_700Bold",
  displayBlack: "Orbitron_900Black",
  monoRegular: "Orbitron_400Regular",
  monoBold: "Orbitron_700Bold",
} as const;

// Type scale — mirroring web hierarchy
// Web base body: Rajdhani 600, 14-16px, letterSpacing 0.01em (~0.2px at 16px)
export const FontSize = {
  h1: 28,
  h2: 22,
  h3: 18,
  bodyLg: 16,
  body: 14,
  bodySm: 13,
  caption: 11,
  button: 13,
  badge: 10,
} as const;

export const LineHeight = {
  h1: 34,
  h2: 28,
  h3: 24,
  bodyLg: 22,
  body: 20,
  bodySm: 18,
  caption: 15,
  button: 18,
  badge: 14,
} as const;

export const LetterSpacing = {
  tight: 0,
  body: 0.2,       // web: 0.01em on 16px base
  display: 0.6,    // web: 0.04em on 16px base
  caps: 1.2,       // badge/caption uppercase
  button: 1.5,     // button label tracking
} as const;
