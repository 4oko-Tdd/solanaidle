# Gamification Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add mission streak system (loot multiplier), daily login bonus (7-day cycle), and animated number/toast feedback to increase game feel.

**Architecture:** Streak is tracked per weekly run on the `weekly_runs` table and applied server-side during loot calculation. Daily login is a new table with per-player claim tracking. Toasts and number animations are pure frontend — a lightweight context provider with portal rendering.

**Tech Stack:** SQLite (better-sqlite3), Hono routes, React context, CSS keyframe animations, `@solanaidle/shared` types.

---

## Task 1: Add Streak Column to Database & Shared Types

**Files:**
- Modify: `apps/api/src/db/schema.ts:121-129` (add migration for streak column)
- Modify: `apps/api/src/services/run-service.ts:188-204` (add streak to mapRun)
- Modify: `packages/shared/src/types.ts:175-189` (add streak to WeeklyRun)

**Step 1: Add streak to WeeklyRun type**

In `packages/shared/src/types.ts`, add `streak` field to `WeeklyRun`:

```typescript
export interface WeeklyRun {
  id: string;
  walletAddress: string;
  classId: ClassId;
  weekStart: string;
  weekEnd: string;
  livesRemaining: number;
  score: number;
  skillPoints: number;
  missionsCompleted: number;
  bossDefeated: boolean;
  active: boolean;
  streak: number; // ← NEW: consecutive mission successes
  startSignature?: string | null;
  endSignature?: string | null;
}
```

**Step 2: Add streak column migration**

In `apps/api/src/db/schema.ts`, add after the existing `end_signature` migration block (~line 129):

```typescript
if (!colNames.includes("streak")) {
  db.exec("ALTER TABLE weekly_runs ADD COLUMN streak INTEGER NOT NULL DEFAULT 0");
}
```

**Step 3: Update mapRun helper**

In `apps/api/src/services/run-service.ts`, update `mapRun()` to include streak:

```typescript
function mapRun(row: any): WeeklyRun {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    classId: row.class_id,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    livesRemaining: row.lives_remaining,
    score: row.score,
    skillPoints: row.skill_points,
    missionsCompleted: row.missions_completed,
    bossDefeated: !!row.boss_defeated,
    active: !!row.active,
    streak: row.streak ?? 0, // ← NEW
    startSignature: row.start_signature ?? null,
    endSignature: row.end_signature ?? null,
  };
}
```

**Step 4: Add streak helpers to run-service**

Add two new exported functions in `apps/api/src/services/run-service.ts`:

```typescript
// Increment streak on mission success
export function incrementStreak(runId: string): number {
  db.prepare("UPDATE weekly_runs SET streak = streak + 1 WHERE id = ?").run(runId);
  const row = db.prepare("SELECT streak FROM weekly_runs WHERE id = ?").get(runId) as any;
  return row?.streak ?? 0;
}

// Reset streak on mission failure
export function resetStreak(runId: string): void {
  db.prepare("UPDATE weekly_runs SET streak = 0 WHERE id = ?").run(runId);
}
```

**Step 5: Build to verify types compile**

Run: `pnpm build`
Expected: Clean build, no errors.

**Step 6: Commit**

```bash
git add packages/shared/src/types.ts apps/api/src/db/schema.ts apps/api/src/services/run-service.ts
git commit -m "feat: add streak tracking column and helpers to weekly runs"
```

---

## Task 2: Apply Streak Multiplier to Loot Calculation

**Files:**
- Modify: `apps/api/src/services/mission-service.ts:14` (add import)
- Modify: `apps/api/src/services/mission-service.ts:112-280` (streak logic in claimMission)
- Modify: `packages/shared/src/types.ts:52-57` (add streakMultiplier to MissionRewards)
- Modify: `packages/shared/src/types.ts:45-50` (add streak to MissionClaimResponse)

**Step 1: Add streakMultiplier to shared types**

In `packages/shared/src/types.ts`:

```typescript
export interface MissionClaimResponse {
  result: MissionResult;
  rewards: MissionRewards | null;
  nftDrop: NftDrop | null;
  character: Character;
  streak: number; // ← NEW: current streak after this mission
}

export interface MissionRewards {
  xp: number;
  scrap: number;
  crystal?: number;
  artifact?: number;
  streakMultiplier?: number; // ← NEW: multiplier that was applied
}
```

**Step 2: Add streak multiplier function to game-config**

In `apps/api/src/services/game-config.ts`, add:

```typescript
export function getStreakMultiplier(streak: number): number {
  if (streak >= 6) return 2.0;
  if (streak >= 4) return 1.5;
  if (streak >= 2) return 1.2;
  return 1.0;
}

export function getStreakLabel(streak: number): string | null {
  if (streak >= 6) return "Unstoppable";
  if (streak >= 4) return "On Fire";
  if (streak >= 2) return "Hot Streak";
  return null;
}
```

**Step 3: Wire streak into claimMission**

In `apps/api/src/services/mission-service.ts`:

Add imports:
```typescript
import { incrementStreak, resetStreak } from "./run-service.js";
import { getStreakMultiplier } from "./game-config.js";
```

In the **failure** path (~line 157-210), after `useLife(runId)`, add:
```typescript
if (runId) {
  resetStreak(runId);
}
```

In the **success** path (~line 213-265), after class loot modifier block and before XP/level-up:

```typescript
// Apply streak multiplier to loot (not XP)
let streakMultiplier = 1.0;
if (runId) {
  const newStreak = incrementStreak(runId);
  streakMultiplier = getStreakMultiplier(newStreak);
  if (streakMultiplier > 1.0) {
    rewards.scrap = Math.floor(rewards.scrap * streakMultiplier);
    if (rewards.crystal) rewards.crystal = Math.floor(rewards.crystal * streakMultiplier);
    if (rewards.artifact) rewards.artifact = Math.floor(rewards.artifact * streakMultiplier);
  }
  rewards.streakMultiplier = streakMultiplier;
}
```

Update the return statement for success to include streak:
```typescript
// At the end of the success block, get current streak
const currentRun = runId ? db.prepare("SELECT streak FROM weekly_runs WHERE id = ?").get(runId) as any : null;
```

Both success and failure return blocks should include:
```typescript
streak: currentRun?.streak ?? 0,
```

**Step 4: Build and verify**

Run: `pnpm build`
Expected: Clean build.

**Step 5: Commit**

```bash
git add apps/api/src/services/mission-service.ts apps/api/src/services/game-config.ts packages/shared/src/types.ts
git commit -m "feat: apply streak loot multiplier on consecutive mission successes"
```

---

## Task 3: Show Streak in Frontend UI

**Files:**
- Modify: `apps/web/src/features/game/RunStatus.tsx` (show streak badge)
- Modify: `apps/web/src/features/game/MissionResultDialog.tsx` (show multiplier)
- Modify: `apps/web/src/hooks/useGameState.ts` (no changes needed — already gets activeRun with streak)

**Step 1: Add streak badge to RunStatus**

In `apps/web/src/features/game/RunStatus.tsx`, in the bottom stats row (after missions count ~line 66), add a streak indicator:

```tsx
{run.streak >= 2 && (
  <span className="text-muted-foreground">
    Streak: <span className={`font-mono font-bold ${
      run.streak >= 6 ? "text-neon-amber" : run.streak >= 4 ? "text-neon-red" : "text-neon-green"
    }`}>
      {run.streak}x
    </span>
  </span>
)}
```

**Step 2: Show streak multiplier in MissionResultDialog**

In `apps/web/src/features/game/MissionResultDialog.tsx`, in the success rewards section, after the existing reward badges:

```tsx
{result.rewards?.streakMultiplier && result.rewards.streakMultiplier > 1 && (
  <Badge className="bg-neon-amber/20 text-neon-amber animate-glow-pulse">
    {result.rewards.streakMultiplier}x Streak Bonus!
  </Badge>
)}
```

Also show streak reset on failure:
```tsx
{result.result === "failure" && result.streak === 0 && (
  <p className="text-xs text-muted-foreground">Streak lost.</p>
)}
```

**Step 3: Build and test manually**

Run: `pnpm build`
Expected: Clean build.

**Step 4: Commit**

```bash
git add apps/web/src/features/game/RunStatus.tsx apps/web/src/features/game/MissionResultDialog.tsx
git commit -m "feat(web): show streak badge in run status and multiplier in result dialog"
```

---

## Task 4: Daily Login — Backend

**Files:**
- Modify: `apps/api/src/db/schema.ts` (add daily_logins table)
- Create: `apps/api/src/services/daily-service.ts` (claim logic)
- Create: `apps/api/src/routes/daily.ts` (GET status + POST claim)
- Modify: `apps/api/src/index.ts:14,39` (register route)
- Modify: `packages/shared/src/types.ts` (add DailyLoginStatus type)

**Step 1: Add DailyLoginStatus to shared types**

In `packages/shared/src/types.ts`, add after the Leaderboard section:

```typescript
// ── Daily Login ──

export interface DailyReward {
  day: number; // 1-7
  scrap: number;
  crystal: number;
  artifact: number;
}

export interface DailyLoginStatus {
  streakDay: number; // 1-7 (which day of the cycle)
  claimedToday: boolean;
  todayReward: DailyReward;
  rewards: DailyReward[]; // all 7 days for calendar display
}
```

**Step 2: Add daily_logins table**

In `apps/api/src/db/schema.ts`, add inside the `initSchema()` `db.exec()` block:

```sql
CREATE TABLE IF NOT EXISTS daily_logins (
  wallet_address TEXT PRIMARY KEY,
  streak_day INTEGER NOT NULL DEFAULT 1,
  last_claim_date TEXT NOT NULL
);
```

**Step 3: Create daily-service.ts**

Create `apps/api/src/services/daily-service.ts`:

```typescript
import db from "../db/database.js";
import type { DailyReward, DailyLoginStatus } from "@solanaidle/shared";

const DAILY_REWARDS: DailyReward[] = [
  { day: 1, scrap: 15, crystal: 0, artifact: 0 },
  { day: 2, scrap: 25, crystal: 0, artifact: 0 },
  { day: 3, scrap: 10, crystal: 3, artifact: 0 },
  { day: 4, scrap: 30, crystal: 5, artifact: 0 },
  { day: 5, scrap: 20, crystal: 10, artifact: 0 },
  { day: 6, scrap: 40, crystal: 15, artifact: 0 },
  { day: 7, scrap: 50, crystal: 20, artifact: 1 },
];

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function getYesterdayUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

interface DailyRow {
  wallet_address: string;
  streak_day: number;
  last_claim_date: string;
}

export function getDailyStatus(wallet: string): DailyLoginStatus {
  const row = db
    .prepare("SELECT * FROM daily_logins WHERE wallet_address = ?")
    .get(wallet) as DailyRow | undefined;

  const today = getTodayUTC();

  if (!row) {
    // Never claimed — show day 1
    return {
      streakDay: 1,
      claimedToday: false,
      todayReward: DAILY_REWARDS[0],
      rewards: DAILY_REWARDS,
    };
  }

  const claimedToday = row.last_claim_date === today;
  let streakDay = row.streak_day;

  // If last claim was NOT yesterday and NOT today, streak resets
  if (!claimedToday && row.last_claim_date !== getYesterdayUTC()) {
    streakDay = 1;
  }

  // If claimed today, next day is the one to show as "today"
  // Otherwise, current streakDay is what they can claim
  const displayDay = claimedToday ? streakDay : streakDay;

  return {
    streakDay: displayDay,
    claimedToday,
    todayReward: DAILY_REWARDS[displayDay - 1],
    rewards: DAILY_REWARDS,
  };
}

export function claimDaily(
  wallet: string,
  characterId: string
): { reward: DailyReward; newStreakDay: number } {
  const today = getTodayUTC();
  const yesterday = getYesterdayUTC();

  const row = db
    .prepare("SELECT * FROM daily_logins WHERE wallet_address = ?")
    .get(wallet) as DailyRow | undefined;

  // Already claimed today
  if (row && row.last_claim_date === today) {
    throw new Error("ALREADY_CLAIMED_TODAY");
  }

  let streakDay: number;
  if (!row) {
    // First ever claim
    streakDay = 1;
    db.prepare(
      "INSERT INTO daily_logins (wallet_address, streak_day, last_claim_date) VALUES (?, ?, ?)"
    ).run(wallet, 1, today);
  } else if (row.last_claim_date === yesterday) {
    // Consecutive day — advance streak
    streakDay = row.streak_day >= 7 ? 1 : row.streak_day + 1;
    db.prepare(
      "UPDATE daily_logins SET streak_day = ?, last_claim_date = ? WHERE wallet_address = ?"
    ).run(streakDay, today, wallet);
  } else {
    // Missed a day — reset to day 1
    streakDay = 1;
    db.prepare(
      "UPDATE daily_logins SET streak_day = 1, last_claim_date = ? WHERE wallet_address = ?"
    ).run(today, wallet);
  }

  const reward = DAILY_REWARDS[streakDay - 1];

  // Add resources to inventory
  db.prepare(
    "UPDATE inventories SET scrap = scrap + ?, crystal = crystal + ?, artifact = artifact + ? WHERE character_id = ?"
  ).run(reward.scrap, reward.crystal, reward.artifact, characterId);

  return { reward, newStreakDay: streakDay };
}
```

**Step 4: Create daily route**

Create `apps/api/src/routes/daily.ts`:

```typescript
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
import { getDailyStatus, claimDaily } from "../services/daily-service.js";

type Env = { Variables: { wallet: string } };

const daily = new Hono<Env>();
daily.use("*", authMiddleware);

daily.get("/status", (c) => {
  const wallet = c.get("wallet");
  const status = getDailyStatus(wallet);
  return c.json(status);
});

daily.post("/claim", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);
  }
  try {
    const result = claimDaily(wallet, char.id);
    return c.json(result);
  } catch (e: any) {
    if (e.message === "ALREADY_CLAIMED_TODAY") {
      return c.json({ error: "ALREADY_CLAIMED", message: "Already claimed today" }, 409);
    }
    throw e;
  }
});

export default daily;
```

**Step 5: Register route in index.ts**

In `apps/api/src/index.ts`, add import and route:

```typescript
import daily from "./routes/daily.js";
// ...
app.route("/daily", daily);
```

**Step 6: Build and verify**

Run: `pnpm build`
Expected: Clean build.

**Step 7: Commit**

```bash
git add packages/shared/src/types.ts apps/api/src/db/schema.ts apps/api/src/services/daily-service.ts apps/api/src/routes/daily.ts apps/api/src/index.ts
git commit -m "feat(api): add daily login bonus system with 7-day reward cycle"
```

---

## Task 5: Daily Login — Frontend Modal

**Files:**
- Create: `apps/web/src/features/game/DailyLoginModal.tsx`
- Modify: `apps/web/src/features/game/GameDashboard.tsx` (fetch status + show modal)

**Step 1: Create DailyLoginModal component**

Create `apps/web/src/features/game/DailyLoginModal.tsx`:

```tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Gift, Check } from "lucide-react";
import type { DailyLoginStatus } from "@solanaidle/shared";
import scrapIcon from "@/assets/icons/res1.png";
import crystalIcon from "@/assets/icons/res2.png";
import artifactIcon from "@/assets/icons/25.png";

interface Props {
  status: DailyLoginStatus;
  open: boolean;
  onClaim: () => Promise<void>;
  onClose: () => void;
}

export function DailyLoginModal({ status, open, onClaim, onClose }: Props) {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await onClaim();
      setClaimed(true);
    } finally {
      setClaiming(false);
    }
  };

  const reward = status.todayReward;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center">
          <Gift className="h-8 w-8 text-neon-amber animate-bounce-in" />
          <DialogTitle className="text-xl font-display">
            {claimed ? "Claimed!" : "Daily Bonus"}
          </DialogTitle>
          <DialogDescription>
            {claimed
              ? `Day ${status.streakDay} reward collected!`
              : `Day ${status.streakDay} of 7 — claim your daily reward!`}
          </DialogDescription>
        </DialogHeader>

        {/* 7-day calendar strip */}
        <div className="flex justify-between gap-1 py-2">
          {status.rewards.map((r) => {
            const isPast = r.day < status.streakDay;
            const isCurrent = r.day === status.streakDay;
            return (
              <div
                key={r.day}
                className={`flex flex-col items-center rounded-lg px-2 py-1.5 text-xs flex-1 ${
                  isCurrent
                    ? "bg-neon-amber/20 border border-neon-amber/40"
                    : isPast
                    ? "bg-white/[0.03] opacity-50"
                    : "bg-white/[0.03]"
                }`}
              >
                <span className="font-mono text-muted-foreground">D{r.day}</span>
                {isPast ? (
                  <Check className="h-3.5 w-3.5 text-neon-green mt-0.5" />
                ) : (
                  <Gift className={`h-3.5 w-3.5 mt-0.5 ${isCurrent ? "text-neon-amber" : "text-muted-foreground"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Today's reward */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 space-y-2">
          <p className="text-xs text-muted-foreground text-center uppercase tracking-wider">
            Today's Reward
          </p>
          <div className="flex items-center justify-center gap-4">
            {reward.scrap > 0 && (
              <div className="flex items-center gap-1">
                <img src={scrapIcon} alt="Scrap" className="h-5 w-5" />
                <span className="font-mono font-bold text-neon-green">+{reward.scrap}</span>
              </div>
            )}
            {reward.crystal > 0 && (
              <div className="flex items-center gap-1">
                <img src={crystalIcon} alt="Crystal" className="h-5 w-5" />
                <span className="font-mono font-bold text-neon-green">+{reward.crystal}</span>
              </div>
            )}
            {reward.artifact > 0 && (
              <div className="flex items-center gap-1">
                <img src={artifactIcon} alt="Artifact" className="h-5 w-5" />
                <span className="font-mono font-bold text-neon-green">+{reward.artifact}</span>
              </div>
            )}
          </div>
        </div>

        {claimed ? (
          <Button onClick={onClose} className="w-full">Continue</Button>
        ) : (
          <Button onClick={handleClaim} disabled={claiming} className="w-full">
            {claiming ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Claiming...</>
            ) : (
              "Claim Reward"
            )}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Wire into GameDashboard**

In `apps/web/src/features/game/GameDashboard.tsx`:

Add imports:
```typescript
import { DailyLoginModal } from "./DailyLoginModal";
import type { DailyLoginStatus } from "@solanaidle/shared";
```

Add state after existing useState calls:
```typescript
const [dailyStatus, setDailyStatus] = useState<DailyLoginStatus | null>(null);
const [showDailyModal, setShowDailyModal] = useState(false);
```

Add useEffect to fetch daily status on mount (after the existing `useEffect` for inventory):
```typescript
useEffect(() => {
  if (!activeRun) return;
  const fetchDaily = async () => {
    try {
      const status = await api<DailyLoginStatus>("/daily/status");
      setDailyStatus(status);
      if (!status.claimedToday) {
        setShowDailyModal(true);
      }
    } catch { /* ignore */ }
  };
  fetchDaily();
}, [activeRun?.id]);
```

Add import for api:
```typescript
import { api } from "@/lib/api";
```

Add claim handler:
```typescript
const handleDailyClaim = async () => {
  await api("/daily/claim", { method: "POST" });
  await refresh();
};
```

Add modal rendering inside the `<>` return, after `MissionResultDialog`:
```tsx
{dailyStatus && (
  <DailyLoginModal
    status={dailyStatus}
    open={showDailyModal}
    onClaim={handleDailyClaim}
    onClose={() => setShowDailyModal(false)}
  />
)}
```

**Step 3: Build and test manually**

Run: `pnpm build`
Expected: Clean build.

**Step 4: Commit**

```bash
git add apps/web/src/features/game/DailyLoginModal.tsx apps/web/src/features/game/GameDashboard.tsx
git commit -m "feat(web): add daily login bonus modal with 7-day calendar strip"
```

---

## Task 6: Toast System

**Files:**
- Create: `apps/web/src/components/ToastProvider.tsx` (context + portal)
- Modify: `apps/web/src/main.tsx` (wrap with ToastProvider)
- Modify: `apps/web/src/index.css` (toast animation keyframes)

**Step 1: Add toast animation to index.css**

In `apps/web/src/index.css`, add after existing keyframes:

```css
@keyframes toastSlideIn {
  from { transform: translateY(16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes toastSlideOut {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(-8px); opacity: 0; }
}
.animate-toast-in {
  animation: toastSlideIn 0.3s ease-out;
}
.animate-toast-out {
  animation: toastSlideOut 0.2s ease-in forwards;
}
```

**Step 2: Create ToastProvider**

Create `apps/web/src/components/ToastProvider.tsx`:

```tsx
import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ToastVariant = "success" | "info" | "warning" | "error";

interface Toast {
  id: number;
  message: string;
  icon?: ReactNode;
  variant: ToastVariant;
  exiting?: boolean;
}

interface ToastContextValue {
  addToast: (message: string, variant?: ToastVariant, icon?: ReactNode) => void;
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-neon-green/30 bg-neon-green/10 text-neon-green",
  info: "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan",
  warning: "border-neon-amber/30 bg-neon-amber/10 text-neon-amber",
  error: "border-neon-red/30 bg-neon-red/10 text-neon-red",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const addToast = useCallback((message: string, variant: ToastVariant = "success", icon?: ReactNode) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, variant, icon }]);
    // Start exit animation after 2.5s, remove after 2.7s
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    }, 2500);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2700);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {createPortal(
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none max-w-sm w-full px-4">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-mono backdrop-blur-xl ${
                VARIANT_STYLES[toast.variant]
              } ${toast.exiting ? "animate-toast-out" : "animate-toast-in"}`}
            >
              {toast.icon}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
```

**Step 3: Wrap app with ToastProvider**

In `apps/web/src/main.tsx`, wrap the component tree:

```tsx
import { ToastProvider } from "@/components/ToastProvider";

// In render:
<WalletProvider>
  <ToastProvider>
    <App />
  </ToastProvider>
</WalletProvider>
```

(Check exact current structure of main.tsx and adapt.)

**Step 4: Build and verify**

Run: `pnpm build`
Expected: Clean build.

**Step 5: Commit**

```bash
git add apps/web/src/components/ToastProvider.tsx apps/web/src/main.tsx apps/web/src/index.css
git commit -m "feat(web): add lightweight toast notification system"
```

---

## Task 7: Animated CurrencyBar + Wire Toasts to Game Events

**Files:**
- Modify: `apps/web/src/components/CurrencyBar.tsx` (animate number changes)
- Modify: `apps/web/src/features/game/GameDashboard.tsx` (fire toasts on events)

**Step 1: Add number animation to CurrencyBar**

Replace `apps/web/src/components/CurrencyBar.tsx` with animated version:

```tsx
import { useRef, useEffect, useState } from "react";
import type { Inventory } from "@solanaidle/shared";
import scrapIcon from "@/assets/icons/res1.png";
import crystalIcon from "@/assets/icons/res2.png";
import artifactIcon from "@/assets/icons/25.png";

interface Props {
  inventory: Inventory;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;
    if (prev === value) return;

    setFlash(true);
    const diff = value - prev;
    const steps = Math.min(Math.abs(diff), 20);
    const stepTime = 400 / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      setDisplay(Math.round(prev + (diff * step) / steps));
      if (step >= steps) {
        clearInterval(interval);
        setDisplay(value);
        setTimeout(() => setFlash(false), 200);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [value]);

  return (
    <span
      className={`text-sm font-mono font-bold transition-transform duration-200 ${
        flash ? "text-white scale-110" : "text-neon-green"
      }`}
    >
      {display}
    </span>
  );
}

export function CurrencyBar({ inventory }: Props) {
  return (
    <div className="flex items-center gap-5">
      <div className="flex items-center gap-1.5">
        <img src={scrapIcon} alt="Scrap" className="h-6 w-6" />
        <AnimatedNumber value={inventory.scrap} />
      </div>
      <div className="flex items-center gap-1.5">
        <img src={crystalIcon} alt="Crystal" className="h-6 w-6" />
        <AnimatedNumber value={inventory.crystal} />
      </div>
      <div className="flex items-center gap-1.5">
        <img src={artifactIcon} alt="Artifact" className="h-6 w-6" />
        <AnimatedNumber value={inventory.artifact} />
      </div>
    </div>
  );
}
```

**Step 2: Fire toasts from GameDashboard on claim results**

In `apps/web/src/features/game/GameDashboard.tsx`, import useToast:

```typescript
import { useToast } from "@/components/ToastProvider";
```

Add inside component:
```typescript
const { addToast } = useToast();
```

Add a useEffect that fires toasts when `lastClaimResult` changes:
```typescript
useEffect(() => {
  if (!lastClaimResult) return;
  if (lastClaimResult.result === "success" && lastClaimResult.rewards) {
    const r = lastClaimResult.rewards;
    addToast(`+${r.scrap} Scrap${r.crystal ? `, +${r.crystal} Crystal` : ""}${r.artifact ? `, +${r.artifact} Artifact` : ""}`, "success");
    if (r.streakMultiplier && r.streakMultiplier > 1) {
      addToast(`${r.streakMultiplier}x Streak Bonus!`, "warning");
    }
  } else if (lastClaimResult.result === "failure") {
    addToast("Mission Failed!", "error");
  }
}, [lastClaimResult, addToast]);
```

Fire toast on daily claim too (inside handleDailyClaim):
```typescript
const handleDailyClaim = async () => {
  await api("/daily/claim", { method: "POST" });
  addToast("Daily bonus claimed!", "success");
  await refresh();
};
```

**Step 3: Build and verify**

Run: `pnpm build`
Expected: Clean build.

**Step 4: Commit**

```bash
git add apps/web/src/components/CurrencyBar.tsx apps/web/src/features/game/GameDashboard.tsx
git commit -m "feat(web): animated currency numbers and toast notifications on game events"
```

---

## Task 8: Final Integration Test

**Step 1: Start dev servers**

Run: `pnpm dev`

**Step 2: Manual test checklist**

- [ ] Connect wallet, start a run
- [ ] Complete a scout mission → verify streak shows 1 in RunStatus (hidden below 2)
- [ ] Complete second mission → verify "Hot Streak" appears, streak 2x
- [ ] Verify reward numbers animate up in CurrencyBar
- [ ] Verify toast notifications appear for rewards
- [ ] Fail a mission → verify streak resets, "Streak lost" message shows
- [ ] Refresh page → verify daily login modal appears
- [ ] Claim daily reward → verify resources added, toast appears
- [ ] Refresh again → verify daily modal does NOT show (already claimed)

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: integration fixes for gamification features"
```
