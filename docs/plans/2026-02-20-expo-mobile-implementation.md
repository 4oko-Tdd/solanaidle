# Expo Mobile App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `apps/mobile` — a React Native Expo app (Expo Router, NativeWind, MWA v2) with full feature parity to `apps/web`, producing a signed Android APK for the Solana dApp Store.

**Architecture:** New `apps/mobile` workspace inside the existing pnpm monorepo. Shares `packages/shared` types and points to the same `apps/api` backend. Replaces `@solana/wallet-adapter-react` with MWA v2 `transact()`. All hooks are ported with minimal changes — only `useAuth`, `useWalletSign`, and `useGameState` (claimMission) need wallet-layer changes.

**Tech Stack:** Expo SDK 53, Expo Router v4, NativeWind v4, `@solana-mobile/mobile-wallet-adapter-protocol-web3js`, `@solana/kit`, `expo-secure-store`, `@lucide/react-native`, React Native Reanimated 3

**Design doc:** `docs/plans/2026-02-20-expo-mobile-design.md`

---

## Phase 1: Scaffold & Config

### Task 1: Create Expo app and wire pnpm workspace

**Files:**
- Create: `apps/mobile/` (via CLI)
- Modify: `apps/mobile/package.json`
- Modify: `pnpm-workspace.yaml` (already covers `apps/*` — verify)

**Step 1: Scaffold with the official Solana Mobile CLI**

```bash
cd /Users/trig/Documents/solanaidle/apps
npx create-expo-app mobile --template expo-template-blank-typescript
```

If that fails or produces a non-router app, use:
```bash
npx create-expo-app mobile -e with-router
```

**Step 2: Replace `package.json` name and add all dependencies**

Replace `apps/mobile/package.json` with:

```json
{
  "name": "@solanaidle/mobile",
  "version": "0.0.1",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "build:android": "eas build --platform android --profile production",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "expo": "~53.0.0",
    "expo-router": "~4.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-haptics": "~14.0.0",
    "expo-image": "~2.0.0",
    "expo-blur": "~14.0.0",
    "expo-constants": "~17.0.0",
    "nativewind": "^4.1.23",
    "tailwindcss": "^3.4.0",
    "react": "18.3.2",
    "react-native": "0.76.7",
    "react-native-reanimated": "~3.16.0",
    "react-native-gesture-handler": "~2.21.0",
    "react-native-safe-area-context": "^4.12.0",
    "react-native-screens": "^4.4.0",
    "@solana/kit": "^2.0.0",
    "@solana-mobile/mobile-wallet-adapter-protocol-web3js": "^2.0.0",
    "@solana-mobile/mobile-wallet-adapter-protocol": "^2.0.0",
    "@lucide/react-native": "^0.475.0",
    "@solanaidle/shared": "workspace:*"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@types/react": "~18.3.12",
    "typescript": "~5.3.3",
    "babel-plugin-module-resolver": "^5.0.2"
  }
}
```

**Step 3: Install dependencies**

```bash
cd /Users/trig/Documents/solanaidle
pnpm install
```

Expected: all packages resolve, `@solanaidle/shared` resolves from workspace.

**Step 4: Verify workspace resolves shared types**

```bash
cd apps/mobile && node -e "require('@solanaidle/shared')" 2>&1 || echo "needs build first"
# If error: cd ../../packages/shared && pnpm build
```

**Step 5: Commit**

```bash
git add apps/mobile/ && git commit -m "feat(mobile): scaffold Expo app workspace"
```

---

### Task 2: Configure Expo Router, NativeWind, TypeScript aliases

**Files:**
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/tailwind.config.js`
- Create: `apps/mobile/babel.config.js`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/global.css`

**Step 1: Create `app.json`**

```json
{
  "expo": {
    "name": "Seeker Node",
    "slug": "seeker-node",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "seekernode",
    "userInterfaceStyle": "dark",
    "newArchEnabled": true,
    "android": {
      "package": "com.seekernode.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0a0a0a"
      },
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [{ "scheme": "seekernode" }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-build-properties",
        {
          "android": {
            "minSdkVersion": 26
          }
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

**Step 2: Create `tailwind.config.js`**

```js
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
      fontFamily: {
        mono: ["SpaceMono-Regular"],
      },
    },
  },
  plugins: [],
};
```

**Step 3: Create `global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 4: Create `babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
```

**Step 5: Create `tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    },
    "moduleResolution": "bundler"
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.d.ts", "expo-env.d.ts"]
}
```

**Step 6: Create `metro.config.js`** (needed for NativeWind + monorepo)

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: watch workspace packages
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = withNativeWind(config, { input: "./global.css" });
```

**Step 7: Commit**

```bash
git add apps/mobile/ && git commit -m "feat(mobile): configure NativeWind, Expo Router, TS aliases"
```

---

### Task 3: Core lib — api.ts, er.ts, utils.ts

These are near-identical ports of `apps/web/src/lib/`. Key differences:
- `localStorage` → `expo-secure-store` (synchronous `getItem`)
- `btoa` → `Buffer.from(...).toString('base64')` (not available in RN)
- `import.meta.env.VITE_API_URL` → `process.env.EXPO_PUBLIC_API_URL`

**Files:**
- Create: `apps/mobile/lib/api.ts`
- Create: `apps/mobile/lib/er.ts`
- Create: `apps/mobile/lib/utils.ts`

**Step 1: Create `lib/api.ts`**

```ts
import * as SecureStore from "expo-secure-store";

// Synchronous read — same ergonomics as localStorage
let authToken: string | null = SecureStore.getItem("auth_token");

export function setAuthToken(token: string) {
  authToken = token;
  SecureStore.setItem("auth_token", token);
}

export function clearAuthToken() {
  authToken = null;
  SecureStore.deleteItemAsync("auth_token");
}

export function getAuthToken() {
  return authToken;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "UNKNOWN", message: res.statusText }));
    throw err;
  }
  return res.json();
}
```

**Step 2: Create `lib/er.ts`**

```ts
/**
 * Player authorization helpers for Ephemeral Rollup actions (mobile version).
 * Uses Buffer instead of btoa (not available in React Native).
 */

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export async function signClaim(
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>,
  wallet: string
): Promise<string | null> {
  try {
    const msg = new TextEncoder().encode(
      `Authorize mission claim\nWallet: ${wallet}`
    );
    const sig = await signMessage(msg);
    return toBase64(sig);
  } catch {
    return null;
  }
}

export async function signOverload(
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>,
  wallet: string
): Promise<string | null> {
  try {
    const msg = new TextEncoder().encode(
      `Authorize boss OVERLOAD\nWallet: ${wallet}`
    );
    const sig = await signMessage(msg);
    return toBase64(sig);
  } catch {
    return null;
  }
}
```

**Step 3: Create `lib/utils.ts`**

```ts
import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
```

Note: install `clsx` — `pnpm --filter @solanaidle/mobile add clsx`

**Step 4: Create `apps/mobile/.env`** (gitignored)

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

**Step 5: Commit**

```bash
git add apps/mobile/lib/ apps/mobile/.env && git commit -m "feat(mobile): add lib/api, lib/er, lib/utils"
```

---

## Phase 2: Auth & Wallet

### Task 4: Wallet provider + auth context

**Files:**
- Create: `apps/mobile/providers/wallet-cache.ts`
- Create: `apps/mobile/providers/wallet-provider.tsx`
- Create: `apps/mobile/providers/auth-context.tsx`

**Step 1: Create `providers/wallet-cache.ts`**

```ts
import * as SecureStore from "expo-secure-store";

// Custom cache for MWA authorization — persists wallet auth across app restarts
export const walletCache = {
  get: async () => {
    const val = await SecureStore.getItemAsync("mwa_auth");
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  },
  set: async (value: unknown) => {
    await SecureStore.setItemAsync("mwa_auth", JSON.stringify(value));
  },
  clear: async () => {
    await SecureStore.deleteItemAsync("mwa_auth");
  },
};
```

**Step 2: Create `providers/auth-context.tsx`**

```tsx
import React, { createContext, useContext, useState, useCallback } from "react";
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import * as SecureStore from "expo-secure-store";
import { api, setAuthToken, clearAuthToken, getAuthToken } from "@/lib/api";
import type { AuthNonceResponse, AuthVerifyResponse } from "@solanaidle/shared";

interface AuthContextValue {
  isAuthenticated: boolean;
  walletAddress: string | null;
  authLoading: boolean;
  authenticate: () => Promise<void>;
  logout: () => Promise<void>;
  signMessage: ((msg: Uint8Array) => Promise<Uint8Array>) | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken());
  const [walletAddress, setWalletAddress] = useState<string | null>(
    SecureStore.getItem("wallet_address")
  );
  const [authLoading, setAuthLoading] = useState(false);

  // signMessage wraps transact() — caller gets a consistent interface
  const signMessage = useCallback(
    async (msg: Uint8Array): Promise<Uint8Array> => {
      return transact(async (wallet) => {
        const cachedAddress = SecureStore.getItem("wallet_address");
        let address: string;

        if (cachedAddress) {
          // Re-authorize with cached token (fast path)
          const auth = await wallet.authorize({
            chain: "solana:mainnet",
            identity: { name: "Seeker Node", uri: "https://seekernode.app", icon: "favicon.ico" },
          });
          address = auth.accounts[0].address;
        } else {
          const auth = await wallet.authorize({
            chain: "solana:mainnet",
            identity: { name: "Seeker Node", uri: "https://seekernode.app", icon: "favicon.ico" },
          });
          address = auth.accounts[0].address;
        }

        const result = await wallet.signMessages({
          addresses: [address],
          payloads: [msg],
        });
        return new Uint8Array(result.signedPayloads[0]);
      });
    },
    []
  );

  const authenticate = useCallback(async () => {
    if (isAuthenticated || authLoading) return;
    setAuthLoading(true);
    try {
      const { nonce } = await api<AuthNonceResponse>("/auth/nonce");

      const { token, address } = await transact(async (wallet) => {
        const auth = await wallet.authorize({
          chain: "solana:mainnet",
          identity: {
            name: "Seeker Node",
            uri: "https://seekernode.app",
            icon: "favicon.ico",
          },
        });

        const walletAddr = auth.accounts[0].address;
        const signed = await wallet.signMessages({
          addresses: [walletAddr],
          payloads: [new TextEncoder().encode(nonce)],
        });

        const res = await api<AuthVerifyResponse>("/auth/verify", {
          method: "POST",
          body: JSON.stringify({
            publicKey: walletAddr,
            signature: Buffer.from(signed.signedPayloads[0]).toString("base64"),
            nonce,
          }),
        });

        return { token: res.token, address: walletAddr };
      });

      setAuthToken(token);
      await SecureStore.setItemAsync("wallet_address", address);
      setWalletAddress(address);
      setIsAuthenticated(true);
    } catch (err) {
      console.error("[useAuth] authenticate failed:", err);
    } finally {
      setAuthLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  const logout = useCallback(async () => {
    clearAuthToken();
    await SecureStore.deleteItemAsync("wallet_address");
    await SecureStore.deleteItemAsync("mwa_auth");
    setWalletAddress(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, walletAddress, authLoading, authenticate, logout, signMessage }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
```

**Step 3: Create `providers/wallet-provider.tsx`**

```tsx
import React from "react";
import { AuthProvider } from "./auth-context";

// MobileWalletProvider wraps MWA session management.
// Auth state is managed separately in AuthProvider for JWT + game session.
export function WalletProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
```

**Step 4: Commit**

```bash
git add apps/mobile/providers/ && git commit -m "feat(mobile): wallet provider + auth context with MWA v2"
```

---

## Phase 3: Navigation Shell

### Task 5: Root layout + auth gate + connect screen

**Files:**
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/index.tsx`
- Create: `apps/mobile/app/connect.tsx`

**Step 1: Create `app/_layout.tsx`**

```tsx
import "../global.css";
import { Stack } from "expo-router";
import { WalletProvider } from "@/providers/wallet-provider";
import { ToastProvider } from "@/components/toast-provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WalletProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="connect" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </ToastProvider>
      </WalletProvider>
    </GestureHandlerRootView>
  );
}
```

**Step 2: Create `app/index.tsx`** (auth gate — redirects based on JWT)

```tsx
import { useEffect } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/providers/auth-context";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/game" />;
  }
  return <Redirect href="/connect" />;
}
```

**Step 3: Create `app/connect.tsx`**

```tsx
import { View, Text, Pressable, Image } from "react-native";
import { useAuth } from "@/providers/auth-context";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function ConnectScreen() {
  const { authenticate, isAuthenticated, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.replace("/(tabs)/game");
  }, [isAuthenticated]);

  return (
    <View className="flex-1 bg-terminal items-center justify-center px-8 gap-8">
      <View className="items-center gap-4">
        <Text className="text-neon-green font-mono text-4xl font-bold tracking-widest">
          SEEKER
        </Text>
        <Text className="text-neon-green font-mono text-4xl font-bold tracking-widest">
          NODE
        </Text>
        <Text className="text-white/40 font-mono text-sm text-center mt-2">
          Deploy your node. Run missions.{"\n"}Survive the epoch.
        </Text>
      </View>

      <Pressable
        onPress={authenticate}
        disabled={authLoading}
        className="w-full border border-neon-green/60 bg-neon-green/10 py-4 items-center"
        style={{ borderRadius: 4 }}
      >
        <Text className="text-neon-green font-mono text-base tracking-widest">
          {authLoading ? "CONNECTING..." : "CONNECT WALLET"}
        </Text>
      </Pressable>

      <Text className="text-white/20 font-mono text-xs text-center">
        Requires a Solana wallet app installed on this device
      </Text>
    </View>
  );
}
```

**Step 4: Commit**

```bash
git add apps/mobile/app/ && git commit -m "feat(mobile): root layout + auth gate + connect screen"
```

---

### Task 6: Tab navigation

**Files:**
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/game/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/ops/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/base/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/guild/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/ranks/_layout.tsx`
- Create: stub `index.tsx` for each tab

**Step 1: Create `app/(tabs)/_layout.tsx`**

```tsx
import { Tabs } from "expo-router";
import { Platform } from "react-native";

// Using standard Expo Router Tabs (NativeTabs is iOS-focused; Tabs works cross-platform)
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#111111",
          borderTopColor: "rgba(0,255,135,0.15)",
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: "#00ff87",
        tabBarInactiveTintColor: "rgba(255,255,255,0.35)",
        tabBarLabelStyle: {
          fontFamily: "SpaceMono-Regular",
          fontSize: 10,
          letterSpacing: 1,
        },
      }}
    >
      <Tabs.Screen
        name="game"
        options={{
          title: "NODE",
          tabBarIcon: ({ color }) => (
            <TabIcon name="shield" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ops"
        options={{
          title: "OPS",
          tabBarIcon: ({ color }) => (
            <TabIcon name="search" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="base"
        options={{
          title: "BASE",
          tabBarIcon: ({ color }) => (
            <TabIcon name="wrench" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="guild"
        options={{
          title: "GUILD",
          tabBarIcon: ({ color }) => (
            <TabIcon name="users" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ranks"
        options={{
          title: "RANKS",
          tabBarIcon: ({ color }) => (
            <TabIcon name="trophy" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, color }: { name: string; color: string }) {
  // Import inline to keep layout file clean
  const icons: Record<string, React.ComponentType<{ size: number; color: string }>> = {
    shield: require("@lucide/react-native").Shield,
    search: require("@lucide/react-native").Search,
    wrench: require("@lucide/react-native").Wrench,
    users: require("@lucide/react-native").Users,
    trophy: require("@lucide/react-native").Trophy,
  };
  const Icon = icons[name];
  return <Icon size={20} color={color} />;
}
```

**Step 2: Create stack layouts for each tab**

Create `app/(tabs)/game/_layout.tsx`:
```tsx
import { Stack } from "expo-router";
export default function GameStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="run-end" />
      <Stack.Screen name="class-picker" options={{ presentation: "formSheet" }} />
      <Stack.Screen name="daily-login" options={{ presentation: "modal" }} />
    </Stack>
  );
}
```

Create `app/(tabs)/ops/_layout.tsx`:
```tsx
import { Stack } from "expo-router";
export default function OpsStack() {
  return <Stack screenOptions={{ headerShown: false }}><Stack.Screen name="index" /></Stack>;
}
```

Create `app/(tabs)/base/_layout.tsx`:
```tsx
import { Stack } from "expo-router";
export default function BaseStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="inventory" />
    </Stack>
  );
}
```

Create `app/(tabs)/guild/_layout.tsx`:
```tsx
import { Stack } from "expo-router";
export default function GuildStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="raid" />
    </Stack>
  );
}
```

Create `app/(tabs)/ranks/_layout.tsx`:
```tsx
import { Stack } from "expo-router";
export default function RanksStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="collection" />
    </Stack>
  );
}
```

**Step 3: Create stub index screens for each tab**

Create `app/(tabs)/game/index.tsx`:
```tsx
import { View, Text, ScrollView } from "react-native";
export default function GameScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-terminal">
      <View className="p-4">
        <Text className="text-neon-green font-mono">GAME TAB — WIP</Text>
      </View>
    </ScrollView>
  );
}
```

Repeat for `ops/index.tsx`, `base/index.tsx`, `guild/index.tsx`, `ranks/index.tsx` — same stub, different label.

**Step 4: Verify app boots**

```bash
cd apps/mobile && npx expo start --android
```

Expected: app launches, shows connect screen or tabs (depending on stored JWT).

**Step 5: Commit**

```bash
git add apps/mobile/app/ && git commit -m "feat(mobile): tab navigation shell with 5 tabs"
```

---

## Phase 4: UI Primitives

### Task 7: UI component library (Button, Card, Badge, Progress)

These replace shadcn/ui. Keep them minimal — only what the feature components use.

**Files:**
- Create: `apps/mobile/components/ui/button.tsx`
- Create: `apps/mobile/components/ui/card.tsx`
- Create: `apps/mobile/components/ui/badge.tsx`
- Create: `apps/mobile/components/ui/progress.tsx`
- Create: `apps/mobile/components/ui/index.ts`

**Step 1: Create `components/ui/button.tsx`**

```tsx
import { Pressable, Text, type PressableProps } from "react-native";
import * as Haptics from "expo-haptics";
import { cn } from "@/lib/utils";

interface ButtonProps extends PressableProps {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}

const variantClasses = {
  default: "bg-neon-green/20 border border-neon-green/60",
  outline: "border border-white/20 bg-transparent",
  ghost: "bg-transparent",
  destructive: "bg-neon-red/20 border border-neon-red/60",
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
  const handlePress = async (e: any) => {
    if (disabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(e);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      className={cn(
        variantClasses[variant],
        sizeClasses[size],
        "items-center justify-center",
        disabled && "opacity-40",
        className
      )}
      style={{ borderRadius: 4 }}
      {...props}
    >
      {typeof children === "string" ? (
        <Text
          className={cn(
            "font-mono tracking-widest",
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

**Step 2: Create `components/ui/card.tsx`**

```tsx
import { View, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";

interface CardProps extends ViewProps {
  className?: string;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <View
      className={cn("bg-surface border border-white/[0.06] p-4", className)}
      style={{ borderRadius: 4, ...props.style }}
      {...props}
    >
      {children}
    </View>
  );
}
```

**Step 3: Create `components/ui/badge.tsx`**

```tsx
import { View, Text } from "react-native";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "green" | "amber" | "cyan" | "purple" | "red";
  className?: string;
}

const variantClasses = {
  default: "bg-white/10 border-white/20",
  green: "bg-neon-green/10 border-neon-green/30",
  amber: "bg-neon-amber/10 border-neon-amber/30",
  cyan: "bg-neon-cyan/10 border-neon-cyan/30",
  purple: "bg-neon-purple/10 border-neon-purple/30",
  red: "bg-neon-red/10 border-neon-red/30",
};

const textVariantClasses = {
  default: "text-white/60",
  green: "text-neon-green",
  amber: "text-neon-amber",
  cyan: "text-neon-cyan",
  purple: "text-neon-purple",
  red: "text-neon-red",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <View
      className={cn(
        "border px-2 py-0.5 flex-row items-center",
        variantClasses[variant],
        className
      )}
      style={{ borderRadius: 2 }}
    >
      <Text className={cn("font-mono text-xs", textVariantClasses[variant])}>
        {children}
      </Text>
    </View>
  );
}
```

**Step 4: Create `components/ui/progress.tsx`**

```tsx
import { View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number; // 0-100
  color?: string;
  className?: string;
}

export function Progress({ value, color = "#00ff87", className }: ProgressProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(`${Math.min(100, Math.max(0, value))}%` as any, { duration: 400 }),
  }));

  return (
    <View
      className={cn("h-1.5 bg-white/10 overflow-hidden", className)}
      style={{ borderRadius: 2 }}
    >
      <Animated.View
        style={[{ height: "100%", backgroundColor: color }, animatedStyle]}
      />
    </View>
  );
}
```

**Step 5: Create `components/ui/index.ts`**

```ts
export { Button } from "./button";
export { Card } from "./card";
export { Badge } from "./badge";
export { Progress } from "./progress";
```

**Step 6: Commit**

```bash
git add apps/mobile/components/ui/ && git commit -m "feat(mobile): UI primitives — Button, Card, Badge, Progress"
```

---

### Task 8: ToastProvider, CurrencyBar, ClassIcon

**Files:**
- Create: `apps/mobile/components/toast-provider.tsx`
- Create: `apps/mobile/components/currency-bar.tsx`
- Create: `apps/mobile/components/class-icon.tsx`

**Step 1: Create `components/toast-provider.tsx`**

```tsx
import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { View, Text, Animated } from "react-native";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const typeColors = { success: "#00ff87", error: "#ff4444", info: "#00d4ff" };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <View
        style={{
          position: "absolute",
          bottom: 100,
          left: 16,
          right: 16,
          zIndex: 9999,
          gap: 8,
        }}
        pointerEvents="none"
      >
        {toasts.map((t) => (
          <View
            key={t.id}
            style={{
              backgroundColor: "#111111",
              borderWidth: 1,
              borderColor: typeColors[t.type],
              padding: 12,
              borderRadius: 4,
            }}
          >
            <Text style={{ color: typeColors[t.type], fontFamily: "SpaceMono-Regular", fontSize: 13 }}>
              {t.message}
            </Text>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
```

**Step 2: Create `components/currency-bar.tsx`**

Port from `apps/web/src/components/CurrencyBar.tsx`. Replace all web imports:

```tsx
import { View, Text, Image } from "react-native";
import type { Inventory } from "@solanaidle/shared";

interface Props {
  inventory: Inventory | null;
}

export function CurrencyBar({ inventory }: Props) {
  if (!inventory) return null;
  return (
    <View className="flex-row gap-4 px-4 py-2 bg-surface border-b border-white/[0.06]">
      <View className="flex-row items-center gap-1.5">
        <Image
          source={require("@/assets/icons/scrap.png")}
          style={{ width: 16, height: 16 }}
        />
        <Text className="text-white/70 font-mono text-sm">{inventory.scrap ?? 0}</Text>
      </View>
      <View className="flex-row items-center gap-1.5">
        <Image
          source={require("@/assets/icons/tokens.png")}
          style={{ width: 16, height: 16 }}
        />
        <Text className="text-neon-cyan font-mono text-sm">{inventory.crystal ?? 0}</Text>
      </View>
      {(inventory.artifact ?? 0) > 0 && (
        <View className="flex-row items-center gap-1.5">
          <Image
            source={require("@/assets/icons/key.png")}
            style={{ width: 16, height: 16 }}
          />
          <Text className="text-neon-amber font-mono text-sm">{inventory.artifact}</Text>
        </View>
      )}
    </View>
  );
}
```

**Note:** Copy `apps/web/src/assets/icons/` → `apps/mobile/assets/icons/` before this step.

**Step 3: Copy assets**

```bash
cp -r apps/web/src/assets/icons apps/mobile/assets/
```

**Step 4: Create `components/class-icon.tsx`**

```tsx
import { View, Text } from "react-native";
import type { ClassId } from "@solanaidle/shared";

const CLASS_ICONS: Record<ClassId, string> = {
  scout: "◈",
  guardian: "⬡",
  mystic: "◆",
};

const CLASS_COLORS: Record<ClassId, string> = {
  scout: "#ffb800",
  guardian: "#00d4ff",
  mystic: "#9945ff",
};

export function ClassIcon({ classId, size = 20 }: { classId: ClassId; size?: number }) {
  return (
    <Text style={{ fontSize: size, color: CLASS_COLORS[classId] }}>
      {CLASS_ICONS[classId]}
    </Text>
  );
}
```

**Step 5: Commit**

```bash
git add apps/mobile/components/ apps/mobile/assets/ && git commit -m "feat(mobile): ToastProvider, CurrencyBar, ClassIcon + assets"
```

---

## Phase 5: Hooks

### Task 9: Port all hooks

The hooks live in `apps/mobile/hooks/`. Most are zero-changes except `useGameState`, `useWalletSign`, and the removed `useAuth` (replaced by `auth-context`).

**Files:**
- Create: `apps/mobile/hooks/use-game-state.ts`
- Create: `apps/mobile/hooks/use-wallet-sign.ts`
- Create: `apps/mobile/hooks/use-boss.ts`
- Create: `apps/mobile/hooks/use-boss-er.ts`
- Create: `apps/mobile/hooks/use-quests.ts`
- Create: `apps/mobile/hooks/use-perks.ts`
- Create: `apps/mobile/hooks/use-collection.ts`
- Create: `apps/mobile/hooks/use-nfts.ts`
- Create: `apps/mobile/hooks/use-ephemeral-progress.ts`
- Create: `apps/mobile/hooks/use-vrf-roll.ts`

**Step 1: Create `hooks/use-wallet-sign.ts`**

```ts
import { useAuth } from "@/providers/auth-context";

// Provides signMessage and walletAddress in a shape compatible with lib/er.ts
export function useWalletSign() {
  const { signMessage, walletAddress } = useAuth();
  return { signMessage, walletAddress };
}
```

**Step 2: Create `hooks/use-game-state.ts`**

Port from `apps/web/src/hooks/useGameState.ts`. Changes:
- Remove `useWallet()` import — use `useWalletSign()` instead
- `publicKey.toBase58()` → `walletAddress`

```ts
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { signClaim } from "@/lib/er";
import { useWalletSign } from "./use-wallet-sign";
import type {
  Character, ActiveMission, MissionType, Inventory,
  UpgradeInfo, MissionClaimResponse, MissionId,
  WeeklyRun, CharacterClass, ClassId, GearTrack,
} from "@solanaidle/shared";

interface GameState {
  character: Character | null;
  missions: MissionType[];
  activeMission: ActiveMission | null;
  inventory: Inventory | null;
  upgradeInfo: UpgradeInfo | null;
  loading: boolean;
  error: string | null;
  lastClaimResult: MissionClaimResponse | null;
  activeRun: WeeklyRun | null;
  classes: CharacterClass[];
  endedRun: WeeklyRun | null;
}

export function useGameState(isAuthenticated: boolean) {
  const { signMessage, walletAddress } = useWalletSign();

  const [state, setState] = useState<GameState>({
    character: null, missions: [], activeMission: null,
    inventory: null, upgradeInfo: null, loading: true,
    error: null, lastClaimResult: null, activeRun: null,
    classes: [], endedRun: null,
  });

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      let char: Character;
      try {
        char = await api<Character>("/character");
      } catch (e: unknown) {
        const err = e as { error?: string };
        if (err.error === "CHARACTER_NOT_FOUND") {
          char = await api<Character>("/character", { method: "POST" });
        } else throw e;
      }
      const [missions, activeRes, inventory, upgradeInfo, runData, classData] =
        await Promise.all([
          api<MissionType[]>("/missions"),
          api<{ activeMission: ActiveMission | null }>("/missions/active"),
          api<Inventory>("/inventory"),
          api<UpgradeInfo>("/upgrades"),
          api<WeeklyRun | null>("/runs/current"),
          api<CharacterClass[]>("/runs/classes"),
        ]);
      let endedRun: WeeklyRun | null = null;
      if (!runData) {
        try { endedRun = await api<WeeklyRun | null>("/runs/ended"); }
        catch { endedRun = null; }
      }
      setState((s) => ({
        ...s, character: char, missions, activeMission: activeRes.activeMission,
        inventory, upgradeInfo, activeRun: runData, classes: classData,
        endedRun, loading: false,
      }));
    } catch (e: unknown) {
      const err = e as { message?: string };
      setState((s) => ({ ...s, loading: false, error: err.message || "Failed to load" }));
    }
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);

  // Poll active mission timer
  useEffect(() => {
    if (!state.activeMission?.timeRemaining) return;
    const interval = setInterval(() => {
      setState((s) => {
        if (!s.activeMission) return s;
        const remaining = Math.max(0, (s.activeMission.timeRemaining ?? 0) - 1);
        return { ...s, activeMission: { ...s.activeMission, timeRemaining: remaining } };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.activeMission?.missionId]);

  const startMission = useCallback(
    async (missionId: MissionId, options?: { rerollStacks?: number; insured?: boolean }) => {
      await api("/missions/start", { method: "POST", body: JSON.stringify({ missionId, ...options }) });
      await refresh();
    }, [refresh]);

  const claimMission = useCallback(async () => {
    const playerSignature = signMessage && walletAddress
      ? await signClaim(signMessage, walletAddress)
      : null;
    const result = await api<MissionClaimResponse>("/missions/claim", {
      method: "POST",
      body: JSON.stringify({ playerSignature }),
    });
    setState((s) => ({ ...s, lastClaimResult: result }));
    await refresh();
    return result;
  }, [refresh, signMessage, walletAddress]);

  const upgradeTrack = useCallback(async (track: GearTrack) => {
    await api(`/upgrades/${track}`, { method: "POST" });
    await refresh();
  }, [refresh]);

  const clearClaimResult = useCallback(() => {
    setState((s) => ({ ...s, lastClaimResult: null }));
  }, []);

  const startRun = useCallback(async (classId: ClassId, signature?: string) => {
    await api("/runs/start", { method: "POST", body: JSON.stringify({ classId, signature }) });
    await refresh();
  }, [refresh]);

  return { ...state, startMission, claimMission, upgradeTrack, refresh, clearClaimResult, startRun };
}
```

**Step 3: Port remaining hooks**

For each of the following, copy from `apps/web/src/hooks/` and make these changes:
- Rename files to kebab-case: `useBoss.ts` → `use-boss.ts`
- Change import path `@/lib/api` stays same (alias configured)
- Remove any `useWallet()` references (replace with `useWalletSign()`)
- `btoa` → `Buffer.from(...).toString('base64')` if used

Hooks to port (mostly zero-change):
- `use-boss.ts` ← `useBoss.ts`
- `use-boss-er.ts` ← `useBossER.ts` (WebSocket works in RN)
- `use-quests.ts` ← `useQuests.ts`
- `use-perks.ts` ← `usePerks.ts`
- `use-collection.ts` ← `useCollection.ts`
- `use-nfts.ts` ← `useNfts.ts`
- `use-ephemeral-progress.ts` ← `useEphemeralProgress.ts`
- `use-vrf-roll.ts` ← `useVrfRoll.ts` (replace `useWallet` with `transact()` for sign)

For `use-vrf-roll.ts`, replace the wallet interaction:
```ts
// Before (web):
const { signTransaction, publicKey } = useWallet();

// After (mobile): use transact() directly
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
```

**Step 4: Commit**

```bash
git add apps/mobile/hooks/ && git commit -m "feat(mobile): port all game hooks"
```

---

## Phase 6: Screens

### Task 10: Game tab — main screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/game/index.tsx`
- Create: `apps/mobile/features/game/character-card.tsx`
- Create: `apps/mobile/features/game/mission-panel.tsx`
- Create: `apps/mobile/features/game/mission-timer.tsx`
- Create: `apps/mobile/features/game/run-status.tsx`

**Step 1: Port `features/game/character-card.tsx`**

Copy from `apps/web/src/features/game/CharacterCard.tsx`. Apply substitutions:
- `div` → `View`, `p`/`span` → `Text`, `button` → `Button` from `@/components/ui`
- `lucide-react` → `@lucide/react-native`
- Remove shadcn imports, use our ui primitives
- `onClick` → `onPress`
- Tailwind classes stay identical (NativeWind handles them)

**Step 2: Port `features/game/mission-panel.tsx`**

Copy from `apps/web/src/features/game/MissionPanel.tsx`. Same substitutions.
- `<img>` → `<Image>` from `expo-image`
- The file references `scrapIcon`, `expIcon` etc — these use `require("@/assets/icons/...")` (already copied)

**Step 3: Port `features/game/mission-timer.tsx`**

Copy from `apps/web/src/features/game/MissionTimer.tsx`. Zero logic changes needed.

**Step 4: Port `features/game/run-status.tsx`**

Copy from `apps/web/src/features/game/RunStatus.tsx`.

**Step 5: Wire up `app/(tabs)/game/index.tsx`**

```tsx
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { useBoss } from "@/hooks/use-boss";
import { CharacterCard } from "@/features/game/character-card";
import { MissionPanel } from "@/features/game/mission-panel";
import { MissionTimer } from "@/features/game/mission-timer";
import { RunStatus } from "@/features/game/run-status";
import { CurrencyBar } from "@/components/currency-bar";
import { useToast } from "@/components/toast-provider";

export default function GameScreen() {
  const router = useRouter();
  const { isAuthenticated, walletAddress } = useAuth();
  const gameState = useGameState(isAuthenticated);
  const { toast } = useToast();
  const { boss } = useBoss(isAuthenticated);

  const handleStartMission = async (missionId: any, options?: any) => {
    try {
      await gameState.startMission(missionId, options);
      toast("Mission started!", "success");
    } catch (e: any) {
      toast(e?.message ?? "Failed to start", "error");
    }
  };

  const handleClaim = async () => {
    try {
      const result = await gameState.claimMission();
      router.push("/(tabs)/game/run-end");
    } catch (e: any) {
      toast(e?.message ?? "Failed to claim", "error");
    }
  };

  if (gameState.loading) {
    return (
      <View className="flex-1 bg-terminal items-center justify-center">
        <ActivityIndicator color="#00ff87" />
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-terminal"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <CurrencyBar inventory={gameState.inventory} />
      <View className="p-4 gap-4">
        {gameState.character && (
          <CharacterCard
            character={gameState.character}
            upgradeInfo={gameState.upgradeInfo}
            inventory={gameState.inventory}
            classId={gameState.activeRun?.classId ?? null}
            onPickClass={() => router.push("/(tabs)/game/class-picker")}
          />
        )}
        {gameState.activeMission ? (
          <MissionTimer
            mission={gameState.activeMission}
            onClaim={handleClaim}
          />
        ) : (
          <MissionPanel
            missions={gameState.missions}
            characterState={gameState.character?.state ?? "idle"}
            onStart={handleStartMission}
            characterLevel={gameState.character?.level}
            classId={gameState.activeRun?.classId ?? null}
            inventory={gameState.inventory}
          />
        )}
        {gameState.activeRun && (
          <RunStatus run={gameState.activeRun} boss={boss} />
        )}
      </View>
    </ScrollView>
  );
}
```

**Step 6: Commit**

```bash
git add apps/mobile/app/(tabs)/game/index.tsx apps/mobile/features/game/ && \
git commit -m "feat(mobile): game tab — CharacterCard, MissionPanel, MissionTimer"
```

---

### Task 11: Game tab — RunEndScreen, ClassPicker, DailyLoginModal

**Files:**
- Create: `apps/mobile/app/(tabs)/game/run-end.tsx`
- Create: `apps/mobile/app/(tabs)/game/class-picker.tsx`
- Create: `apps/mobile/app/(tabs)/game/daily-login.tsx`
- Create: `apps/mobile/features/game/run-end-screen.tsx`
- Create: `apps/mobile/features/game/class-picker.tsx`
- Create: `apps/mobile/features/game/daily-login-modal.tsx`
- Create: `apps/mobile/features/game/mission-result-dialog.tsx`

**Step 1: Port each feature component**

Same pattern as Task 10: copy from web, apply element substitutions.
`RunEndScreen.tsx` — complex (472 lines), VRF integration. Key changes:
- Lucide icons → `@lucide/react-native`
- `Dialog` → handled by route `presentation: "formSheet"` in `class-picker`

**Step 2: Wire `app/(tabs)/game/run-end.tsx`**

```tsx
import { ScrollView } from "react-native";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { RunEndScreen } from "@/features/game/run-end-screen";
import { useRouter } from "expo-router";

export default function RunEndRoute() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { endedRun, refresh, character } = useGameState(isAuthenticated);

  return (
    <RunEndScreen
      run={endedRun}
      character={character}
      onClose={() => { refresh(); router.back(); }}
    />
  );
}
```

**Step 3: Wire `app/(tabs)/game/class-picker.tsx`**

```tsx
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { ClassPicker } from "@/features/game/class-picker";
import { useRouter } from "expo-router";

export default function ClassPickerRoute() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { classes, startRun, activeRun } = useGameState(isAuthenticated);

  return (
    <ClassPicker
      classes={classes}
      currentClassId={activeRun?.classId ?? null}
      onSelect={async (classId, sig) => {
        await startRun(classId, sig);
        router.back();
      }}
    />
  );
}
```

**Step 4: Commit**

```bash
git add apps/mobile/app/(tabs)/game/ apps/mobile/features/game/ && \
git commit -m "feat(mobile): game tab — RunEndScreen, ClassPicker, DailyLoginModal"
```

---

### Task 12: Ops tab — QuestPanel, RunLog, RunStatus

**Files:**
- Modify: `apps/mobile/app/(tabs)/ops/index.tsx`
- Create: `apps/mobile/features/game/quest-panel.tsx`
- Create: `apps/mobile/features/game/run-log.tsx`

**Step 1: Port `features/game/quest-panel.tsx`**

Copy from `apps/web/src/features/game/QuestPanel.tsx` (539 lines). Apply element substitutions. This is the largest component — take it section by section.

Key: `FlatList` instead of `map` inside `ScrollView` for long lists:
```tsx
// Instead of:
missions.map(m => <MissionCard key={m.id} />)
// Use:
<FlatList data={missions} keyExtractor={m => m.id} renderItem={({ item }) => <MissionCard m={item} />} />
```

**Step 2: Port `features/game/run-log.tsx`**

Copy from `apps/web/src/features/game/RunLog.tsx`.

**Step 3: Wire `app/(tabs)/ops/index.tsx`**

```tsx
import { ScrollView, View } from "react-native";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { useQuests } from "@/hooks/use-quests";
import { QuestPanel } from "@/features/game/quest-panel";
import { RunLog } from "@/features/game/run-log";

export default function OpsScreen() {
  const { isAuthenticated } = useAuth();
  const { activeRun, character } = useGameState(isAuthenticated);
  const { quests, claimQuest } = useQuests(isAuthenticated);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-terminal"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="p-4 gap-4">
        <QuestPanel quests={quests} run={activeRun} onClaim={claimQuest} />
        <RunLog run={activeRun} />
      </View>
    </ScrollView>
  );
}
```

**Step 4: Commit**

```bash
git add apps/mobile/app/(tabs)/ops/ apps/mobile/features/game/quest-panel.tsx \
  apps/mobile/features/game/run-log.tsx && \
git commit -m "feat(mobile): ops tab — QuestPanel, RunLog"
```

---

### Task 13: Base tab — UpgradePanel, PerkPicker, Inventory

**Files:**
- Modify: `apps/mobile/app/(tabs)/base/index.tsx`
- Create: `apps/mobile/app/(tabs)/base/inventory.tsx`
- Create: `apps/mobile/features/game/upgrade-panel.tsx`
- Create: `apps/mobile/features/game/perk-picker.tsx`
- Create: `apps/mobile/features/inventory/inventory-panel.tsx`

**Step 1: Port each feature component** following same substitution pattern.

**Step 2: Wire `app/(tabs)/base/index.tsx`**

```tsx
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { usePerks } from "@/hooks/use-perks";
import { UpgradePanel } from "@/features/game/upgrade-panel";
import { PerkPicker } from "@/features/game/perk-picker";
import { CurrencyBar } from "@/components/currency-bar";

export default function BaseScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { upgradeInfo, inventory, upgradeTrack, character } = useGameState(isAuthenticated);
  const { perks, activatePerk } = usePerks(isAuthenticated);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-terminal"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <CurrencyBar inventory={inventory} />
      <View className="p-4 gap-4">
        <UpgradePanel upgradeInfo={upgradeInfo} inventory={inventory} onUpgrade={upgradeTrack} />
        <PerkPicker perks={perks} inventory={inventory} onActivate={activatePerk} />
      </View>
    </ScrollView>
  );
}
```

**Step 3: Commit**

```bash
git add apps/mobile/app/(tabs)/base/ apps/mobile/features/ && \
git commit -m "feat(mobile): base tab — UpgradePanel, PerkPicker, Inventory"
```

---

### Task 14: Guild tab

**Files:**
- Modify: `apps/mobile/app/(tabs)/guild/index.tsx`
- Modify: `apps/mobile/app/(tabs)/guild/raid.tsx`
- Create: `apps/mobile/features/guild/guild-panel.tsx`
- Create: `apps/mobile/features/guild/raid-panel.tsx`
- Create: `apps/mobile/features/guild/create-guild-dialog.tsx`
- Create: `apps/mobile/features/guild/join-guild-dialog.tsx`

**Step 1: Port guild feature components**

Copy from `apps/web/src/features/guild/`. Apply element substitutions.

`CreateGuildDialog` and `JoinGuildDialog` — these are dialogs in the web. On mobile, present them as modal screens or inline within `guild-panel.tsx` using conditional rendering. Simplest: inline them with a `useState` toggle (no route needed).

**Step 2: Wire `app/(tabs)/guild/index.tsx`**

```tsx
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/auth-context";
import { GuildPanel } from "@/features/guild/guild-panel";

export default function GuildScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-terminal"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="p-4">
        <GuildPanel
          isAuthenticated={isAuthenticated}
          onViewRaid={() => router.push("/(tabs)/guild/raid")}
        />
      </View>
    </ScrollView>
  );
}
```

**Step 3: Commit**

```bash
git add apps/mobile/app/(tabs)/guild/ apps/mobile/features/guild/ && \
git commit -m "feat(mobile): guild tab — GuildPanel, RaidPanel"
```

---

### Task 15: Ranks tab — Leaderboard, TrophyCase, BossFight, PermanentCollection

**Files:**
- Modify: `apps/mobile/app/(tabs)/ranks/index.tsx`
- Create: `apps/mobile/app/(tabs)/ranks/collection.tsx`
- Create: `apps/mobile/features/game/leaderboard-panel.tsx`
- Create: `apps/mobile/features/game/trophy-case.tsx`
- Create: `apps/mobile/features/game/boss-fight.tsx`
- Create: `apps/mobile/features/game/permanent-collection.tsx`

**Step 1: Port feature components** from web, same substitution pattern.

`BossFight.tsx` — uses boss WebSocket data from `useBossER`. Hook works unchanged in RN.

**Step 2: Wire `app/(tabs)/ranks/index.tsx`**

```tsx
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { useBoss } from "@/hooks/use-boss";
import { LeaderboardPanel } from "@/features/game/leaderboard-panel";
import { TrophyCase } from "@/features/game/trophy-case";
import { BossFight } from "@/features/game/boss-fight";

export default function RanksScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { activeRun, character } = useGameState(isAuthenticated);
  const { boss, applyDamage } = useBoss(isAuthenticated);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-terminal"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="p-4 gap-4">
        <BossFight boss={boss} run={activeRun} onOverload={applyDamage} />
        <LeaderboardPanel isAuthenticated={isAuthenticated} />
        <TrophyCase run={activeRun} onViewCollection={() => router.push("/(tabs)/ranks/collection")} />
      </View>
    </ScrollView>
  );
}
```

**Step 3: Commit**

```bash
git add apps/mobile/app/(tabs)/ranks/ apps/mobile/features/game/leaderboard-panel.tsx \
  apps/mobile/features/game/trophy-case.tsx apps/mobile/features/game/boss-fight.tsx \
  apps/mobile/features/game/permanent-collection.tsx && \
git commit -m "feat(mobile): ranks tab — Leaderboard, TrophyCase, BossFight, Collection"
```

---

## Phase 7: Build & Ship

### Task 16: EAS Build config + final APK

**Files:**
- Create: `apps/mobile/eas.json`
- Modify: `apps/mobile/app.json` (verify package name + signing)

**Step 1: Create `eas.json`**

```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**Step 2: Set up EAS project**

```bash
cd apps/mobile
npx eas-cli login          # login to Expo account
npx eas-cli build:configure # links project to EAS, generates projectId in app.json
```

**Step 3: Build development APK for testing**

```bash
npx eas build --platform android --profile preview --local
# --local builds on this machine (needs Android SDK / Java)
# Remove --local to build on EAS cloud (easier)
```

**Step 4: Build production APK for submission**

```bash
npx eas build --platform android --profile production
```

Expected: EAS returns a download URL for a signed `.apk`

**Step 5: Commit final config**

```bash
git add apps/mobile/eas.json apps/mobile/app.json && \
git commit -m "feat(mobile): EAS build config for Android APK"
```

---

## Verification Checklist

Before calling the implementation complete, verify:

- [ ] App launches on Android device/emulator without crash
- [ ] "Connect Wallet" screen appears for new users
- [ ] MWA opens the wallet app when "Connect Wallet" tapped
- [ ] After auth, tabs are visible with bottom tab bar
- [ ] Game tab shows character card and mission panel
- [ ] Mission can be started and timer counts down
- [ ] Mission claim opens wallet for signMessage
- [ ] Ops tab shows quests and run log
- [ ] Base tab shows upgrades and perks
- [ ] Guild tab shows guild panel
- [ ] Ranks tab shows leaderboard and boss
- [ ] `eas build --platform android --profile preview` produces a working APK
- [ ] APK installs on a physical Android device

---

## Common Gotchas

1. **`btoa` not available in RN** — always use `Buffer.from(...).toString('base64')`
2. **`window` / `document` not available** — any web-only APIs in ported components need guards or removal
3. **`import.meta.env`** — not available in RN; use `process.env.EXPO_PUBLIC_*` (set in `.env`)
4. **Tailwind classes on `Text`** — in NativeWind v4, most text styles work on `Text`, but `flex` classes need `View`
5. **Monorepo Metro** — the `metro.config.js` must declare `watchFolders` to include `packages/shared`, otherwise shared types won't resolve
6. **MWA requires a real Android device or emulator** — it cannot run in Expo Go or on iOS
7. **`SecureStore.getItem` is synchronous** — but `getItemAsync` is async; use `getItem` for the initial token load in `api.ts`
8. **`react-native-reanimated` plugin order** — must be last in `babel.config.js` plugins array
