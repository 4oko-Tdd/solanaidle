# Mobile Web-Parity UI Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Expo Android app visually match the web reference — fix broken typography weight rendering, add neon glow shadows, gradient progress bar, and badge polish.

**Architecture:** Token-first approach — create `apps/mobile/theme/` with typed constants, update `tailwind.config.js` to expose per-weight font family variants, then sweep all `<Text>` elements and update UI primitives. No architecture changes.

**Tech Stack:** Expo SDK 53, NativeWind v4, expo-linear-gradient (already installed), expo-blur (already installed), React Native Reanimated (already installed), Lucide React Native.

**Reference:** See design doc at `docs/plans/2026-02-22-mobile-web-parity-design.md` for full token mapping.

**Working directory for all commands:** `apps/mobile/`

---

## Task 1: Create theme directory and token files

**Files:**
- Create: `apps/mobile/theme/typography.ts`
- Create: `apps/mobile/theme/colors.ts`
- Create: `apps/mobile/theme/shadows.ts`
- Create: `apps/mobile/theme/spacing.ts`
- Create: `apps/mobile/theme/index.ts`

**Step 1: Create `apps/mobile/theme/typography.ts`**

```ts
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
```

**Step 2: Create `apps/mobile/theme/colors.ts`**

```ts
// All hex values verified against web app CSS variables and tailwind.config
export const Colors = {
  // Backgrounds
  background: "#0a0a0a",         // hsl(240 10% 4%) ≈ #0a0a12 — close enough
  surface: "#111111",            // hsl(240 10% 6%)
  surfaceElevated: "#1a1a27",   // hsl(240 10% 12%) — modals/elevated panels

  // Borders
  border: "#1f1f2e",             // hsl(240 10% 14%)
  borderSubtle: "rgba(255,255,255,0.06)",  // web: border-white/[0.06]
  borderMedium: "rgba(255,255,255,0.1)",   // web: border-white/[0.1]

  // Text
  textPrimary: "rgba(240,247,255,0.98)",   // hsl(210 40% 98%)
  textSecondary: "rgba(255,255,255,0.70)",
  textMuted: "rgba(135,158,185,0.85)",     // hsl(215 20% 65%)
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
```

**Step 3: Create `apps/mobile/theme/shadows.ts`**

```ts
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
```

**Step 4: Create `apps/mobile/theme/spacing.ts`**

```ts
// Mirror web Tailwind spacing scale
export const Spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;
```

**Step 5: Create `apps/mobile/theme/index.ts`**

```ts
export { Colors } from "./colors";
export { FontFamily, FontSize, LineHeight, LetterSpacing } from "./typography";
export { Shadows } from "./shadows";
export { Spacing, Radius } from "./spacing";
```

**Step 6: Commit**

```bash
git add apps/mobile/theme/
git commit -m "feat(mobile/theme): add typed design tokens (typography, colors, shadows, spacing)"
```

---

## Task 2: Update tailwind.config.js with per-weight font families

**Files:**
- Modify: `apps/mobile/tailwind.config.js`

**Background:** NativeWind on Android cannot synthesize bold weights from a single font family name. Each weight variant must be its own named font family. We also promote the default `font-sans` to use Rajdhani 600SemiBold (matching web's `font-weight: 600` body default). Cases that truly need 400 weight use `font-sans-regular`.

**Step 1: Replace `fontFamily` section in `apps/mobile/tailwind.config.js`**

Old block:
```js
fontFamily: {
  sans: ["Rajdhani_400Regular", "system-ui"],
  display: ["Orbitron_700Bold", "system-ui"],
  mono: ["Orbitron_400Regular", "system-ui"],
},
```

New block:
```js
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
```

**Step 2: Verify NativeWind can see the config change**

Run: `cd apps/mobile && npx nativewind --version` (or check that tailwind.config is picked up)

Nothing to run at this point — visual verification comes after. Just ensure the file saved correctly.

**Step 3: Commit**

```bash
git add apps/mobile/tailwind.config.js
git commit -m "feat(mobile/theme): add per-weight font family variants to tailwind config"
```

---

## Task 3: Polish core UI component — Badge

**Files:**
- Modify: `apps/mobile/components/ui/badge.tsx`

**Change:** Add `textTransform: 'uppercase'` and `letterSpacing: 1.2` to match web badge style (`text-[10px] uppercase tracking-wider`). Also reduce size closer to web's 10px.

**Step 1: Read current file first**

Open `apps/mobile/components/ui/badge.tsx` and confirm current state.

**Step 2: Update the Text inside Badge**

Current text element:
```tsx
<Text className={cn("font-mono text-xs", textVariantClasses[variant])}>
  {children}
</Text>
```

Replace with:
```tsx
<Text
  className={cn("font-mono", textVariantClasses[variant])}
  style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase" }}
>
  {children}
</Text>
```

Import: Add `import { FontSize, LetterSpacing } from "@/theme"` at top, then use constants:
```tsx
style={{ fontSize: FontSize.badge, letterSpacing: LetterSpacing.caps, textTransform: "uppercase" }}
```

**Step 3: Commit**

```bash
git add apps/mobile/components/ui/badge.tsx
git commit -m "feat(mobile/ui): badge uppercase + letterSpacing matches web reference"
```

---

## Task 4: Polish core UI component — Progress (gradient fill)

**Files:**
- Modify: `apps/mobile/components/ui/progress.tsx`

**Change:** Replace single `backgroundColor` fill with `LinearGradient` (purple→green), increase height from 6px to 8px to match web's `h-2`.

**Background:** `expo-linear-gradient` is already in the project (used in tab bar). Import `LinearGradient` from it.

**Step 1: Read current progress component**

Open `apps/mobile/components/ui/progress.tsx`.

**Step 2: Replace the Animated.View fill**

Remove `backgroundColor: color` from the animated fill view. Wrap in LinearGradient.

Replace:
```tsx
<Animated.View
  style={[{ height: "100%", backgroundColor: color }, animatedStyle]}
/>
```

With:
```tsx
<Animated.View style={[{ height: "100%", overflow: "hidden" }, animatedStyle]}>
  <LinearGradient
    colors={["#9945FF", "#14F195"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={{ flex: 1 }}
  />
</Animated.View>
```

Add import at top: `import { LinearGradient } from "expo-linear-gradient";`

Also update the track height:
```tsx
<View
  className={cn("h-2 bg-white/10 overflow-hidden rounded-full", className)}
```
(was `h-1.5 rounded-sm` — change to `h-2 rounded-full` to match web's `h-2 rounded-full`)

Remove the `color` prop since gradient is now fixed (or keep it as fallback — remove for simplicity per YAGNI).

Updated interface:
```tsx
interface ProgressProps {
  value: number; // 0-100
  className?: string;
}
```

**Step 3: Commit**

```bash
git add apps/mobile/components/ui/progress.tsx
git commit -m "feat(mobile/ui): progress bar uses purple→green gradient + h-2 height matching web"
```

---

## Task 5: Polish core UI component — Card (shadows + glow)

**Files:**
- Modify: `apps/mobile/components/ui/card.tsx`

**Changes:**
- Add `boxShadow: Shadows.md` to all cards (base depth)
- Add `boxShadow: Shadows.glowGreen` when `highlight=true` (matches web `glow-green`)
- Increase BlurView `intensity` from 20 to 28 (closer to web's `backdrop-blur-md`)
- Change border colors to use semantic tokens

**Step 1: Read current card component**

Open `apps/mobile/components/ui/card.tsx`.

**Step 2: Update Card**

```tsx
import { View, type ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import { Shadows } from "@/theme";

interface CardProps extends ViewProps {
  highlight?: boolean;
}

export function Card({ highlight, children, style, ...props }: CardProps) {
  return (
    <View
      style={[
        {
          borderRadius: 12,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: highlight
            ? "rgba(20,241,149,0.4)"
            : "rgba(255,255,255,0.06)",
          boxShadow: highlight ? Shadows.glowGreen : Shadows.md,
        },
        style,
      ]}
    >
      <BlurView intensity={28} tint="dark">
        <View
          style={{ backgroundColor: "rgba(10,22,40,0.82)", padding: 20, gap: 12 }}
          {...props}
        >
          {children}
        </View>
      </BlurView>
    </View>
  );
}
```

Key changes:
- `borderColor` non-highlight: `rgba(26,58,92,0.6)` → `rgba(255,255,255,0.06)` (matches web `border-white/[0.06]`)
- `intensity`: 20 → 28
- Added `boxShadow`

**Step 3: Commit**

```bash
git add apps/mobile/components/ui/card.tsx
git commit -m "feat(mobile/ui): card glow shadows + web-faithful border + stronger blur"
```

---

## Task 6: Polish core UI component — Button (press feedback + text weight)

**Files:**
- Modify: `apps/mobile/components/ui/button.tsx`

**Changes:**
- Primary button text: `font-mono` (Orbitron 400) → `font-mono-bold` (Orbitron 700)
- Add visual press feedback: `activeOpacity` via Pressable `style` callback
- Add subtle `boxShadow: Shadows.glowGreen` on default variant (like web hover glow, static version)

**Step 1: Read current button component**

Open `apps/mobile/components/ui/button.tsx`.

**Step 2: Update Button**

```tsx
import { Pressable, Text, View, type PressableProps, type GestureResponderEvent } from "react-native";
import * as Haptics from "expo-haptics";
import { cn } from "@/lib/utils";
import { Shadows } from "@/theme";
import type { ReactNode } from "react";

interface ButtonProps extends PressableProps {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
}

const variantClasses = {
  default: "bg-neon-green/20 border border-neon-green/60",
  outline: "border border-white/20 bg-transparent",
  ghost: "bg-transparent",
  destructive: "bg-neon-red/20 border border-neon-red/60",
};

const variantShadow: Record<string, string | undefined> = {
  default: Shadows.glowGreen,
  outline: undefined,
  ghost: undefined,
  destructive: Shadows.glowRed,
};

const textClasses = {
  default: "text-neon-green",
  outline: "text-white/70",
  ghost: "text-white/50",
  destructive: "text-neon-red",
};

const sizeClasses = {
  sm: "px-3 py-1.5",
  md: "px-4 py-2.5",
  lg: "px-6 py-4",
};

const textSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export function Button({
  variant = "default",
  size = "md",
  children,
  className,
  onPress,
  disabled,
  ...props
}: ButtonProps) {
  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(e);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => ({
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
        boxShadow: !disabled ? variantShadow[variant] : undefined,
      })}
      className={cn(
        variantClasses[variant],
        sizeClasses[size],
        "items-center justify-center rounded-lg",
        className
      )}
      {...props}
    >
      {typeof children === "string" ? (
        <Text
          className={cn(
            "font-mono-bold tracking-widest",
            textClasses[variant],
            textSizeClasses[size]
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
```

Key changes:
- `font-mono` → `font-mono-bold` (Orbitron 700 for button labels)
- `style` callback on Pressable for press scale + opacity feedback
- `boxShadow` added via style (not className — must use style for dynamic values)
- Moved `disabled` opacity to the style callback for consistency

**Step 3: Commit**

```bash
git add apps/mobile/components/ui/button.tsx
git commit -m "feat(mobile/ui): button press feedback, Orbitron bold labels, neon glow"
```

---

## Task 7: Typography sweep — feature/game files

**Files to modify (full list from git status):**
- `apps/mobile/features/game/boss-fight.tsx`
- `apps/mobile/features/game/character-card.tsx`
- `apps/mobile/features/game/class-picker.tsx`
- `apps/mobile/features/game/daily-login-modal.tsx`
- `apps/mobile/features/game/leaderboard-panel.tsx`
- `apps/mobile/features/game/mission-panel.tsx`
- `apps/mobile/features/game/mission-result-dialog.tsx`
- `apps/mobile/features/game/mission-timer.tsx`
- `apps/mobile/features/game/perk-picker.tsx`
- `apps/mobile/features/game/permanent-collection.tsx`
- `apps/mobile/features/game/quest-panel.tsx`
- `apps/mobile/features/game/run-end-screen.tsx`
- `apps/mobile/features/game/run-log.tsx`
- `apps/mobile/features/game/run-status.tsx`
- `apps/mobile/features/game/trophy-case.tsx`
- `apps/mobile/features/game/upgrade-panel.tsx`
- `apps/mobile/features/guild/guild-panel.tsx`
- `apps/mobile/features/guild/raid-panel.tsx`
- `apps/mobile/features/inventory/inventory-panel.tsx`

**Migration rule (apply to ALL files):**

| Old class | New class | Note |
|---|---|---|
| `font-bold` (standalone) | `font-sans-bold` | Rajdhani 700 |
| `font-semibold` (standalone) | `font-sans-semibold` | Rajdhani 600 |
| `font-sans font-bold` | `font-sans-bold` | Remove `font-bold` |
| `font-sans font-semibold` | `font-sans-semibold` | Remove `font-semibold` |
| `font-mono font-bold` | `font-mono-bold` | Orbitron 700 |
| `font-mono font-semibold` | `font-mono-bold` | Orbitron 700 |
| `font-display font-bold` | `font-display` | display is already 700 |
| `text-white font-medium` | `text-white font-sans-semibold` | Web default = 600 |

**NOTE:** The `font-sans` tailwind config change (Task 2) means that ANY `<Text>` with no explicit font class will ALREADY default to Rajdhani 600 after that change. The sweep is for explicit `font-bold`/`font-semibold` utility classes.

**Step 1: Grep for font-bold usage in features**

Run: `grep -r "font-bold\|font-semibold\|font-medium" apps/mobile/features/ --include="*.tsx" -l`

**Step 2: For each file returned — open, find all matching className strings, apply migration rule**

Apply migration rule to each match. Use exact search-replace.

**Step 3: Commit after each logical group of files**

```bash
git add apps/mobile/features/game/
git commit -m "feat(mobile/typography): fix font weights in game features (full sweep)"

git add apps/mobile/features/guild/ apps/mobile/features/inventory/
git commit -m "feat(mobile/typography): fix font weights in guild + inventory features"
```

---

## Task 8: Typography sweep — components and app screens

**Files:**
- `apps/mobile/components/currency-bar.tsx`
- `apps/mobile/components/toast-provider.tsx`
- `apps/mobile/components/glass-panel.tsx` (new file, may not have issues)
- `apps/mobile/app/(tabs)/base/index.tsx`
- `apps/mobile/app/(tabs)/game/index.tsx`
- `apps/mobile/app/(tabs)/game/run-end.tsx`

**Step 1: Grep for font-bold usage in components and app**

Run: `grep -r "font-bold\|font-semibold\|font-medium" apps/mobile/components/ apps/mobile/app/ --include="*.tsx" -l`

**Step 2: Apply migration rule to each file**

Same rule as Task 7.

**Step 3: Commit**

```bash
git add apps/mobile/components/ apps/mobile/app/
git commit -m "feat(mobile/typography): fix font weights in components + app screens"
```

---

## Task 9: Add letterSpacing to key Text elements

**Context:** Web's body has `letter-spacing: 0.01em`. On mobile, `letterSpacing: 0.2` approximates this at ~14px. This must be done via inline `style` prop since NativeWind doesn't have a `tracking-body` utility.

**Strategy:** Only add to structural/hierarchical text (headings, section labels). The impact at body text is subtle and adding it everywhere is too invasive. Focus on:
- Screen title / panel title Text elements (headings → `letterSpacing: 0.5`)
- Section label Text elements → `letterSpacing: 0.3`

**Step 1: Look through feature files for `<Text` with heading-like content**

Examples to update:
```tsx
// Before:
<Text className="font-display text-lg text-white">MISSION STATUS</Text>

// After:
<Text className="font-display text-lg text-white" style={{ letterSpacing: 0.5 }}>
  MISSION STATUS
</Text>
```

This is a best-effort pass — touch the most visible headings in each panel, not every text node.

**Step 2: Commit**

```bash
git add apps/mobile/features/ apps/mobile/components/
git commit -m "feat(mobile/typography): add letterSpacing to headings for web parity"
```

---

## Task 10: Visual verification pass

No code changes. Manual verification checklist:

**Build and run on Android:**
```bash
cd apps/mobile
npx expo start --android
```

**Checklist:**
- [ ] Body text is visibly heavier/thicker than before (Rajdhani 600 vs 400)
- [ ] Button labels use Orbitron Bold (visibly thicker than before)
- [ ] Badge text is uppercase with wider letter spacing
- [ ] Progress bars show purple→green gradient
- [ ] Cards have depth shadow (not flat)
- [ ] Highlighted cards have green glow (mission in progress, etc.)
- [ ] Pressing a button shows opacity + scale animation
- [ ] Font weights look consistent across all 5 tabs

**If any check fails:** Go back to the relevant task and investigate. The most likely failure modes are:
1. NativeWind not picking up font family changes — restart Metro with `--clear`
2. `boxShadow` not visible — verify the device is running New Architecture (RN 0.76+ with Expo SDK 53 should be fine)
3. LinearGradient in Progress not rendering — check that `expo-linear-gradient` is in `apps/mobile/package.json`

---

## Summary

| Phase | Task | Impact |
|---|---|---|
| Theme tokens | Task 1 | Foundation |
| Tailwind font fix | Task 2 | **Critical — fixes all body text weight** |
| Badge polish | Task 3 | Medium |
| Progress gradient | Task 4 | High visual impact |
| Card shadows | Task 5 | High — adds depth |
| Button feedback | Task 6 | Medium — feel improvement |
| Feature typography sweep | Tasks 7–8 | **Critical — fixes all feature text** |
| Letter spacing | Task 9 | Low — refinement |
| Verification | Task 10 | Required |

Total estimated commits: ~10–12 small commits.
