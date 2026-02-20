# Expo Mobile App Design — Seeker Node
**Date:** 2026-02-20
**Context:** Monolith hackathon by Solana Mobile — requires functional Android APK, mobile-first, MWA integrated

---

## Goal

Port the existing React/Vite web app (`apps/web`) to a React Native Expo app (`apps/mobile`) that produces a signed Android APK for the Solana dApp Store. Full feature parity with the web app. No PWA wrapper — real native UI.

---

## Architecture Overview

```
apps/mobile/               ← New Expo app (Expo Router, NativeWind v4)
  app/
    _layout.tsx            ← Root providers: MobileWalletProvider + ToastProvider
    index.tsx              ← Auth gate: JWT present → /(tabs)/game, else → /connect
    connect.tsx            ← "Connect Wallet" screen
    (tabs)/
      _layout.tsx          ← NativeTabs (5 tabs)
      game/
        _layout.tsx        ← Stack
        index.tsx          ← CharacterCard + MissionPanel + MissionTimer
        run-end.tsx        ← RunEndScreen (pushed after claim)
        class-picker.tsx   ← ClassPicker (formSheet)
        daily-login.tsx    ← DailyLoginModal (modal)
      ops/
        _layout.tsx        ← Stack
        index.tsx          ← QuestPanel + RunLog + RunStatus
      base/
        _layout.tsx        ← Stack
        index.tsx          ← UpgradePanel + PerkPicker
        inventory.tsx      ← InventoryPanel
      guild/
        _layout.tsx        ← Stack
        index.tsx          ← GuildPanel
        raid.tsx           ← RaidPanel
      ranks/
        _layout.tsx        ← Stack
        index.tsx          ← LeaderboardPanel + TrophyCase
        collection.tsx     ← PermanentCollection
  components/
    ui/                    ← Button, Card, Badge, Progress (NativeWind primitives)
    class-icon.tsx         ← ClassIcon (port of ClassIcon.tsx)
    currency-bar.tsx       ← CurrencyBar
    toast-provider.tsx     ← Toast provider
  features/
    game/                  ← CharacterCard, MissionPanel, MissionTimer, etc.
    guild/                 ← GuildPanel, RaidPanel
    inventory/             ← InventoryPanel
    wallet/                ← ConnectButton
  hooks/                   ← Ported hooks (mostly zero-change)
  lib/
    api.ts                 ← Same as web, SecureStore replaces localStorage
    er.ts                  ← Zero change
    utils.ts               ← Zero change
  providers/
    wallet-provider.tsx    ← MobileWalletProvider + walletCache
    wallet-cache.ts        ← expo-secure-store cache for MWA auth

packages/shared/           ← Zero changes — types imported as @solanaidle/shared
apps/api/                  ← Zero changes — same Hono backend
```

---

## Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | Expo SDK 53 + Expo Router v4 | Official Solana Mobile recommendation |
| Navigation | NativeTabs (unstable-native-tabs) | Native Android bottom nav, best mobile UX score |
| Styling | NativeWind v4 | Tailwind classes in RN, preserves cyberpunk aesthetic |
| Wallet | MWA v2 via `@solana-mobile/mobile-wallet-adapter-protocol-web3js` | Official Solana Mobile stack |
| Solana SDK | `@solana/kit` (web3.js v2) | Tree-shakeable, modern, replaces web3.js v1 |
| Token storage | `expo-secure-store` | Android Keystore, replaces localStorage |
| Icons | `@lucide/react-native` | 1:1 drop-in for lucide-react |
| Images | `expo-image` | SF Symbols support, optimized |
| Animations | `react-native-reanimated` | Progress bars, entrance animations |
| Haptics | `expo-haptics` | Button press feedback on Android |
| Build | EAS Build | Signed APK for dApp Store |

---

## Wallet & Auth Layer

### MWA v2 Setup

```ts
// providers/wallet-provider.tsx
import { MobileWalletProvider } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { walletCache } from "./wallet-cache";

export function WalletProvider({ children }) {
  return (
    <MobileWalletProvider cluster="mainnet-beta" cache={walletCache}>
      {children}
    </MobileWalletProvider>
  );
}
```

```ts
// providers/wallet-cache.ts — persists MWA auth token across sessions
import * as SecureStore from "expo-secure-store";

export const walletCache = {
  get: async () => {
    const val = await SecureStore.getItemAsync("mwa_auth");
    return val ? JSON.parse(val) : null;
  },
  set: async (value: unknown) =>
    SecureStore.setItemAsync("mwa_auth", JSON.stringify(value)),
  clear: () => SecureStore.deleteItemAsync("mwa_auth"),
};
```

### Auth Flow (nonce → signMessage → JWT)

```ts
// hooks/use-auth.ts
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import * as SecureStore from "expo-secure-store";
import { api } from "@/lib/api";

export function useAuth() {
  const authenticate = async () => {
    const { nonce } = await api("/auth/nonce");

    const token = await transact(async (wallet) => {
      const auth = await wallet.authorize({
        chain: "solana:mainnet",
        identity: { name: "Seeker Node", uri: "https://seekernode.app", icon: "/icon.png" },
      });

      const signed = await wallet.signMessages({
        addresses: [auth.accounts[0].address],
        payloads: [new TextEncoder().encode(nonce)],
      });

      const res = await api("/auth/verify", {
        method: "POST",
        body: JSON.stringify({
          publicKey: auth.accounts[0].address,
          signature: Buffer.from(signed.signedPayloads[0]).toString("base64"),
          nonce,
        }),
      });
      return res.token;
    });

    await SecureStore.setItemAsync("auth_token", token);
  };

  return { authenticate };
}
```

### `lib/api.ts` Token Storage Change

```ts
// Before (web):   localStorage.getItem("auth_token")
// After (mobile): SecureStore.getItem("auth_token")  ← synchronous read

import * as SecureStore from "expo-secure-store";

export const getAuthToken = () => SecureStore.getItem("auth_token");
export const setAuthToken = (t: string) => SecureStore.setItem("auth_token", t);
export const clearAuthToken = () => SecureStore.deleteItemAsync("auth_token");
```

`SecureStore.getItem()` is synchronous — same ergonomics as `localStorage.getItem`.

---

## Tab Navigation

```tsx
// app/(tabs)/_layout.tsx
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="game">
        <Icon sf="shield.lefthalf.filled" /><Label>Node</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ops">
        <Icon sf="magnifyingglass" /><Label>Ops</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="base">
        <Icon sf="wrench.and.screwdriver" /><Label>Base</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="guild">
        <Icon sf="person.3" /><Label>Guild</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ranks">
        <Icon sf="trophy" /><Label>Ranks</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

---

## Styling System

NativeWind v4 with the existing cyberpunk palette:

```ts
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      "neon-green":  "#00ff87",
      "neon-amber":  "#ffb800",
      "neon-cyan":   "#00d4ff",
      "neon-purple": "#9945ff",
      terminal:      "#0a0a0a",
      surface:       "#111111",
    }
  }
}
```

All existing Tailwind class names from the web app work identically in NativeWind.

### shadcn/ui Replacements

| Web (shadcn) | Mobile |
|---|---|
| `<Button>` | `Pressable` + NativeWind + `expo-haptics` |
| `<Card>` | `View` with `className="bg-surface border border-white/10"` |
| `<Badge>` | `View` + `Text` (small) |
| `<Progress>` | `View` with Reanimated animated width |
| `<Dialog>` | Expo Router `formSheet` (`presentation: "formSheet"`) |
| `<DropdownMenu>` | `Link.Menu` context menu from Expo Router |

---

## Hook Migration

| Hook | Change Required |
|---|---|
| `useAuth.ts` | Rewrite: `useWallet()` → `transact()`, `localStorage` → `SecureStore` |
| `useWalletSign.ts` | Rewrite: use `transact()` for signing |
| `useVrfRoll.ts` | Minor: `transact()` replaces wallet adapter `signTransaction` |
| `useGameState.ts` | **Zero changes** |
| `useMission.ts` | **Zero changes** |
| `useQuests.ts` | **Zero changes** |
| `useBoss.ts` | **Zero changes** |
| `useBossER.ts` | **Zero changes** (WebSocket native in RN) |
| `useEphemeralProgress.ts` | **Zero changes** |
| `usePerks.ts` | **Zero changes** |
| `useCollection.ts` | **Zero changes** |
| `useNfts.ts` | **Zero changes** |

---

## Component Migration Rules

### Element Substitutions

| Web | Mobile |
|---|---|
| `div` | `View` |
| `p`, `span`, `h1-h6` | `Text` |
| `button` | `Pressable` |
| `img` | `Image` from `expo-image` |
| `onClick` | `onPress` |
| `lucide-react` | `@lucide/react-native` (same icon names) |

### Screen Root Pattern (required by Expo UI guidelines)

```tsx
// Every tab root screen wraps content in ScrollView:
<ScrollView contentInsetAdjustmentBehavior="automatic">
  {/* content */}
</ScrollView>
```

### Modal/Sheet Pattern

```tsx
// Dialogs become native sheets via Expo Router:
<Stack.Screen name="class-picker" options={{
  presentation: "formSheet",
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.5, 1.0],
}} />
```

---

## Key Dependencies (`apps/mobile/package.json`)

```json
{
  "name": "@solanaidle/mobile",
  "dependencies": {
    "expo": "~53.0.0",
    "expo-router": "~4.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-haptics": "~14.0.0",
    "expo-image": "~2.0.0",
    "expo-blur": "~14.0.0",
    "nativewind": "^4.0.0",
    "tailwindcss": "^3.4.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-gesture-handler": "~2.21.0",
    "react-native-safe-area-context": "^4.12.0",
    "@solana/kit": "^2.0.0",
    "@solana-mobile/mobile-wallet-adapter-protocol-web3js": "^2.0.0",
    "@solana-mobile/mobile-wallet-adapter-protocol": "^2.0.0",
    "@lucide/react-native": "latest",
    "@solanaidle/shared": "workspace:*"
  }
}
```

---

## `app.json` Config

```json
{
  "expo": {
    "name": "Seeker Node",
    "slug": "seeker-node",
    "scheme": "seekernode",
    "android": {
      "package": "com.seekernode.app",
      "intentFilters": [{
        "action": "VIEW",
        "autoVerify": true,
        "data": [{ "scheme": "seekernode" }],
        "category": ["BROWSABLE", "DEFAULT"]
      }]
    },
    "plugins": ["expo-router", "expo-secure-store"]
  }
}
```

---

## Scaffold Command

```bash
# From repo root:
cd apps && npm create solana-dapp@latest
# → select "React Native (Expo)" → name "mobile"
# → then wire up pnpm workspace + shared types
```

---

## Build & Submit

```bash
# Dev:
pnpm --filter @solanaidle/mobile run start

# Android APK for submission:
eas build --platform android --profile production
```

---

## What Does NOT Change

- `apps/api/` — zero changes
- `packages/shared/` — zero changes
- All shared types imported as `@solanaidle/shared`
- All game logic hooks (timers, quests, boss, missions)
- `lib/er.ts`, `lib/utils.ts`
- Boss WebSocket subscription (`useBossER.ts`)
- Tailwind color names and class conventions
