# Mobile → Web UI Parity Design

**Date:** 2026-02-22
**Goal:** Bring the Expo/Android app visually in line with the web reference (same cyberpunk neon aesthetic, typography hierarchy, glass surfaces, and production polish).

---

## Reference Map: Web → RN Tokens

### Typography

| Token | Web | RN value | Notes |
|---|---|---|---|
| Default body | Rajdhani 600, `letter-spacing: 0.01em` | Rajdhani_600SemiBold, `letterSpacing: 0.2` | **Critical fix** |
| Body medium | Rajdhani 500 | Rajdhani_600SemiBold (closest loaded) | 500 not loaded |
| Body bold | Rajdhani 700 | Rajdhani_700Bold | Needs explicit font-family name |
| Display/heading | Orbitron 700, `letter-spacing: 0.04em` | Orbitron_700Bold, `letterSpacing: 0.6` | Correct already |
| Display black | Orbitron 900 | Orbitron_900Black | Available |
| Mono | Orbitron 400/500 | Orbitron_400Regular | Fine |
| Mono bold | Orbitron 700 | Orbitron_700Bold | Needs explicit mapping |

**Root problem:** `tailwind.config.js` maps `font-sans` to `Rajdhani_400Regular` only. On Android, `font-bold` does NOT auto-switch to the correct font file. All body text renders at weight 400 (thin) instead of 600 (semibold). Fix: expose per-weight font family names as Tailwind utilities.

**Type scale (explicit px sizes):**
- `h1`: 28px, display, letterSpacing 0.6
- `h2`: 22px, display, letterSpacing 0.5
- `h3`: 18px, display or sans-bold, letterSpacing 0.4
- `body-lg`: 16px, sans-semibold
- `body`: 14px, sans-semibold (new default)
- `body-sm`: 13px, sans-semibold
- `caption`: 11px, sans-semibold, uppercase, letterSpacing 1.2
- `button`: 13px, mono-bold (Orbitron_700Bold), uppercase, letterSpacing 1.5
- `badge`: 10px, mono, uppercase, letterSpacing 1.2

### Colors

All neon values are identical across web and mobile. No changes to hex values.

| Semantic | Hex | Usage |
|---|---|---|
| background | `#0a0a12` | Screen root (using `#0a0a0a`, close enough) |
| surface | `#111111` | Card backgrounds |
| surfaceElevated | `#1a1a27` | Modals, elevated panels |
| border | `#1f1f2e` | Subtle borders (currently `rgba(26,58,92,0.6)`) |
| borderSubtle | `rgba(255,255,255,0.06)` | Glass card borders (matches web) |
| textPrimary | `rgba(240,247,255,0.98)` | Main text |
| textMuted | `rgba(135,158,185,0.85)` | Secondary text |
| accent | `#9945FF` | Purple, primary interactions |
| success | `#14F195` | Green, success states |
| warning | `#FFB800` | Amber, warnings |
| danger | `#FF3366` | Red, destructive |
| info | `#00D4FF` | Cyan, informational |

### Shadows / Glows (web-faithful values)

```ts
glowGreen:  "0 0 20px rgba(20,241,149,0.15), 0 0 40px rgba(20,241,149,0.05)"
glowPurple: "0 0 20px rgba(153,69,255,0.15), 0 0 40px rgba(153,69,255,0.05)"
glowRed:    "0 0 20px rgba(255,51,102,0.2), 0 0 40px rgba(255,51,102,0.05)"
glowCyan:   "0 0 20px rgba(0,212,255,0.15), 0 0 40px rgba(0,212,255,0.05)"
shadowSm:   "0 1px 3px rgba(0,0,0,0.4)"
shadowMd:   "0 4px 12px rgba(0,0,0,0.5)"
shadowLg:   "0 8px 24px rgba(0,0,0,0.6)"
```

All applied via `boxShadow` style prop (CSS syntax, RN 0.76+ New Architecture). No `elevation`.

### Component Gaps

| Component | Issue | Fix |
|---|---|---|
| Progress | Single color, not gradient | LinearGradient `#9945FF → #14F195` fill |
| Badge | Missing `uppercase` + `letterSpacing` | Add text transform + tracking |
| Button | No visual press feedback | Add `activeOpacity=0.8` or scale 0.97 |
| Button text | Orbitron 400, not 700 | Use `Orbitron_700Bold` for primary |
| RunStatus | Inline raw NativeWind, no BlurView | Keep as-is (low priority) |
| Card | Background more opaque than web | Acceptable Android approximation |

---

## Implementation Plan (8 Phases)

### Phase 1 — Typography (highest impact)

**Files to create/modify:**
- `apps/mobile/theme/typography.ts` — explicit type scale constants
- `apps/mobile/tailwind.config.js` — add per-weight font family variants
- `apps/mobile/app/_layout.tsx` — load `Rajdhani_500Medium` if available
- **Full sweep** of all `<Text>` elements in `features/` and `components/` to use correct font families

**Tailwind font extensions to add:**
```js
fontFamily: {
  'sans':            ['Rajdhani_400Regular', 'system-ui'],
  'sans-medium':     ['Rajdhani_600SemiBold', 'system-ui'],   // 500 not loaded → use 600
  'sans-semibold':   ['Rajdhani_600SemiBold', 'system-ui'],
  'sans-bold':       ['Rajdhani_700Bold', 'system-ui'],
  'display':         ['Orbitron_700Bold', 'system-ui'],
  'display-black':   ['Orbitron_900Black', 'system-ui'],
  'mono':            ['Orbitron_400Regular', 'system-ui'],
  'mono-bold':       ['Orbitron_700Bold', 'system-ui'],
}
```

Migration rule for full sweep:
- `font-sans font-semibold` → `font-sans-semibold`
- `font-sans font-bold` → `font-sans-bold`
- `font-mono font-bold` → `font-mono-bold`
- Default bare text → should be `font-sans-semibold` (web default is weight 600)

### Phase 2 — Colors & Surfaces

**Files to create/modify:**
- `apps/mobile/theme/colors.ts` — expand with semantic tokens
- `apps/mobile/lib/theme.ts` — add new semantic tokens

Minimal changes — web and mobile colors are already aligned.

### Phase 3 — Shadows & Glows

**Files to create/modify:**
- `apps/mobile/theme/shadows.ts` — glow + shadow presets

Apply to:
- `Card` component — `glowGreen` on highlight, `shadowMd` on all cards
- `Button` default variant — subtle `glowPurple` or `glowGreen`
- Currency bar / header elements

### Phase 4 — Spacing

Spacing rhythm already good. Formalize in `theme/spacing.ts` for reference only. No layout changes needed.

### Phase 5 — Icons

- Icon sizes already consistent (20px, strokeWidth 1.5)
- No changes needed — Lucide already matches web

### Phase 6 — Component Polish

**Button:**
- Primary: use `font-mono-bold`, add `activeOpacity={0.8}` + `glowGreen` shadow
- All: `Pressable` → wrap with `Animated` scale feedback (0.97 on press)

**Badge:**
- Add `textTransform: 'uppercase'` + `letterSpacing: 1.2` to Badge text
- Reduce font size to 10 for `text-[10px]` parity

**Progress:**
- Replace `backgroundColor: color` with `LinearGradient` fill (purple→green)
- Height: increase from 6px (`h-1.5`) to 8px (`h-2`) to match web

**Card:**
- Add `boxShadow: shadowMd` to base card
- Add `boxShadow: glowGreen` when `highlight=true`

### Phase 7 — Translucency/Blur

Web uses `backdrop-blur-md` (16px blur) on cards. Mobile uses `BlurView intensity={20}` which approximates this.
- Increase BlurView `intensity` from 20 to 28 to be closer to `backdrop-blur-md`
- The tab bar already uses intensity 28 — align cards to match

### Phase 8 — Micro-interactions

- Button press: scale 0.97 via Reanimated `withSpring`
- Already has haptic feedback — keep
- Modal transitions: already handled by Expo Router

---

## Scope Summary

**Files to create:**
- `apps/mobile/theme/typography.ts`
- `apps/mobile/theme/colors.ts`
- `apps/mobile/theme/shadows.ts`
- `apps/mobile/theme/spacing.ts`
- `apps/mobile/theme/index.ts` (barrel export)

**Files to modify:**
- `apps/mobile/tailwind.config.js` (font family extensions)
- `apps/mobile/app/_layout.tsx` (possibly load Rajdhani_500Medium)
- `apps/mobile/components/ui/button.tsx`
- `apps/mobile/components/ui/card.tsx`
- `apps/mobile/components/ui/badge.tsx`
- `apps/mobile/components/ui/progress.tsx`
- All `features/game/*.tsx` — full typography sweep
- All `features/guild/*.tsx`, `features/inventory/*.tsx`
- `apps/mobile/components/currency-bar.tsx`
- `apps/mobile/components/toast-provider.tsx`

---

## Web → RN Parity: Impossible / Approximated

| Web feature | RN approximation | Why |
|---|---|---|
| `backdrop-blur-md` CSS | BlurView intensity=28 | React Native BlurView is closest available |
| CSS variable fonts (auto weight synthesis) | Explicit fontFamily per weight | Android requires explicit font files |
| `:hover` glow animations | boxShadow static (no hover on mobile) | Mobile has no hover state |
| CSS keyframe animations (glow-pulse, shimmer) | Reanimated — implement only key ones | CSS keyframes not available in RN |
| `bg-gradient-to-r` on progress | LinearGradient component | CSS gradients need expo-linear-gradient |
| `border-gradient` gradient borders | Not supported | Complex CSS mask technique, skip |
| Scrollbar customization | N/A | Not applicable on mobile |
