# Stakes & Narrative Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make existing game mechanics feel more impactful through stakes text, run event log, dynamic risk labels, and wallet signature ceremonies.

**Architecture:** Server-side `run_events` table logs every significant game event. Frontend gets new RunLog timeline, enhanced RunStatus header with week number + status badges, dynamic mission card labels based on lives, and wallet signMessage flows for run start/end.

**Tech Stack:** Hono (backend), React 19 + Tailwind + shadcn/ui (frontend), better-sqlite3 (DB), @solana/connector (wallet signing)

---

### Task 1: DB Schema — run_events table + signature columns

**Files:**
- Modify: `apps/api/src/db/schema.ts`

**Step 1: Add run_events table and signature columns to schema**

In `apps/api/src/db/schema.ts`, add after the `leaderboard` table CREATE (before the closing backtick at line 109):

```typescript
    CREATE TABLE IF NOT EXISTS run_events (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES weekly_runs(id),
      event_type TEXT NOT NULL,
      data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_run_events_run ON run_events(run_id);
```

Also add the two new columns to `weekly_runs` table. Since SQLite `CREATE TABLE IF NOT EXISTS` won't add columns, we need to add ALTER TABLE statements **after** the main `db.exec()` block. Add after `initSchema`'s closing `);`:

```typescript
  // Migrations — add columns if missing
  const cols = db.prepare("PRAGMA table_info(weekly_runs)").all() as { name: string }[];
  const colNames = cols.map(c => c.name);
  if (!colNames.includes("start_signature")) {
    db.exec("ALTER TABLE weekly_runs ADD COLUMN start_signature TEXT");
  }
  if (!colNames.includes("end_signature")) {
    db.exec("ALTER TABLE weekly_runs ADD COLUMN end_signature TEXT");
  }
```

**Step 2: Verify schema loads**

Run: `cd apps/api && npx tsx src/db/schema.ts`
Or just: `pnpm --filter api dev` and check it starts without errors.

**Step 3: Commit**

```bash
git add apps/api/src/db/schema.ts
git commit -m "feat(db): add run_events table and signature columns"
```

---

### Task 2: Shared Types — RunEvent + updated WeeklyRun

**Files:**
- Modify: `packages/shared/src/types.ts`

**Step 1: Add RunEvent types**

Add after the `WeeklyRun` interface (around line 187):

```typescript
// ── Run Events ──

export type RunEventType =
  | "run_start"
  | "mission_success"
  | "mission_fail"
  | "death"
  | "revive"
  | "level_up"
  | "boss_kill"
  | "skill_unlock"
  | "nft_drop"
  | "run_end";

export interface RunEvent {
  id: string;
  runId: string;
  eventType: RunEventType;
  data: Record<string, unknown>;
  createdAt: string;
}
```

**Step 2: Add signature fields to WeeklyRun**

In the `WeeklyRun` interface, add two optional fields:

```typescript
  startSignature?: string | null;
  endSignature?: string | null;
```

**Step 3: Commit**

```bash
git add packages/shared/src/types.ts
git commit -m "feat(shared): add RunEvent type and signature fields to WeeklyRun"
```

---

### Task 3: Backend — Event logging service

**Files:**
- Create: `apps/api/src/services/event-service.ts`

**Step 1: Create the event service**

```typescript
import { randomUUID } from "crypto";
import db from "../db/database.js";
import type { RunEvent, RunEventType } from "@solanaidle/shared";

export function insertEvent(
  runId: string,
  eventType: RunEventType,
  data: Record<string, unknown> = {}
): void {
  db.prepare(
    "INSERT INTO run_events (id, run_id, event_type, data) VALUES (?, ?, ?, ?)"
  ).run(randomUUID(), runId, eventType, JSON.stringify(data));
}

export function getRunEvents(runId: string): RunEvent[] {
  const rows = db
    .prepare("SELECT * FROM run_events WHERE run_id = ? ORDER BY created_at ASC")
    .all(runId) as any[];
  return rows.map((row) => ({
    id: row.id,
    runId: row.run_id,
    eventType: row.event_type as RunEventType,
    data: JSON.parse(row.data || "{}"),
    createdAt: row.created_at,
  }));
}
```

**Step 2: Commit**

```bash
git add apps/api/src/services/event-service.ts
git commit -m "feat(api): add run event logging service"
```

---

### Task 4: Backend — Wire events into mission-service

**Files:**
- Modify: `apps/api/src/services/mission-service.ts`

**Step 1: Add import**

At the top of `mission-service.ts`, add:

```typescript
import { insertEvent } from "./event-service.js";
```

**Step 2: Log mission_fail event (with escape detection)**

In the `claimMission` function, inside the `if (roll < finalFailRate)` block:

After the Lucky Escape check (the `if (hasSkill(runId, "scout_escape") && Math.random() < 0.5)` block, around line 163), before the `return`, add:

```typescript
        insertEvent(runId, "mission_fail", {
          missionId: missionRow.mission_id,
          livesRemaining: -1, // escaped, no life lost
          escaped: true,
        });
```

After `useLife(runId);` (line 173), add:

```typescript
      const runAfterLife = db.prepare("SELECT lives_remaining FROM weekly_runs WHERE id = ?").get(runId) as any;
      const livesLeft = runAfterLife?.lives_remaining ?? 0;
      insertEvent(runId, "mission_fail", {
        missionId: missionRow.mission_id,
        livesRemaining: livesLeft,
        escaped: false,
      });
      if (livesLeft <= 0) {
        insertEvent(runId, "run_end", {
          finalScore: 0, // score already on the run row
          cause: "death",
        });
      }
```

**Step 3: Log mission_success event**

After the run-aware success handling block (after `markBossDefeated` / `addSkillPoints` calls, around line 255), add:

```typescript
    if (runId) {
      insertEvent(runId, "mission_success", {
        missionId: missionRow.mission_id,
        xp: rewards.xp,
        scrap: rewards.scrap,
        crystal: rewards.crystal ?? 0,
        artifact: rewards.artifact ?? 0,
      });

      // Boss kill event
      if (missionRow.mission_id === "boss") {
        insertEvent(runId, "boss_kill", {
          xp: rewards.xp,
          scrap: rewards.scrap,
          crystal: rewards.crystal ?? 0,
          artifact: rewards.artifact ?? 0,
        });
      }
    }
```

**Step 4: Log level_up event**

After the level-up while loop (around line 233), add:

```typescript
  if (newLevel > charRow.level && runId) {
    insertEvent(runId, "level_up", { newLevel });
  }
```

**Step 5: Log nft_drop event**

After the NFT drop insert (around line 268), add inside the `if (nftChance > 0 ...)` block:

```typescript
    if (runId) {
      insertEvent(runId, "nft_drop", { nftName, missionId: mission.id });
    }
```

**Step 6: Verify build**

Run: `pnpm --filter api build` (or just `pnpm --filter api dev` and confirm no errors)

**Step 7: Commit**

```bash
git add apps/api/src/services/mission-service.ts
git commit -m "feat(api): log run events from mission service"
```

---

### Task 5: Backend — Wire events into run-service + skill-service

**Files:**
- Modify: `apps/api/src/services/run-service.ts`
- Modify: `apps/api/src/services/skill-service.ts`

**Step 1: Add events to run-service**

Add import at top of `run-service.ts`:

```typescript
import { insertEvent } from "./event-service.js";
```

In `startRun()`, after the INSERT and before the return (around line 52), add:

```typescript
  insertEvent(id, "run_start", { classId, weekNumber: getWeekNumber() });
```

Add a helper function at the bottom of the file:

```typescript
function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.ceil((diff / oneWeek) + 1);
}
```

In `endRun()`, before the `db.prepare("UPDATE weekly_runs SET active = 0")` call, add:

```typescript
  insertEvent(runId, "run_end", {
    finalScore: run.score,
    missionsCompleted: run.missions_completed,
    cause: "voluntary",
  });
```

**Step 2: Add signature storage to run-service**

Add a new function to `run-service.ts`:

```typescript
export function storeStartSignature(runId: string, signature: string): void {
  db.prepare("UPDATE weekly_runs SET start_signature = ? WHERE id = ?").run(signature, runId);
}

export function storeEndSignature(runId: string, signature: string): void {
  db.prepare("UPDATE weekly_runs SET end_signature = ? WHERE id = ?").run(signature, runId);
}
```

Update `mapRun` to include signatures:

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
    startSignature: row.start_signature ?? null,
    endSignature: row.end_signature ?? null,
  };
}
```

**Step 3: Add events to skill-service**

Add import at top of `skill-service.ts`:

```typescript
import { insertEvent } from "./event-service.js";
```

In `unlockSkill()`, after the INSERT (line 72), add:

```typescript
  insertEvent(runId, "skill_unlock", { skillId, skillName: skill.name });
```

**Step 4: Commit**

```bash
git add apps/api/src/services/run-service.ts apps/api/src/services/skill-service.ts
git commit -m "feat(api): log events in run-service and skill-service"
```

---

### Task 6: Backend — API routes for events + finalize

**Files:**
- Modify: `apps/api/src/routes/runs.ts`

**Step 1: Add imports**

Add to imports at top of `runs.ts`:

```typescript
import { getRunEvents } from "../services/event-service.js";
import { storeStartSignature, storeEndSignature, endRun } from "../services/run-service.js";
```

Update the existing import from run-service to also export `endRun` if not already there.

**Step 2: Add events endpoint**

After the `/leaderboard` route, add:

```typescript
// Get events for a run
runs.get("/:id/events", (c) => {
  const runId = c.req.param("id");
  const events = getRunEvents(runId);
  return c.json(events);
});
```

**Step 3: Modify /start to accept signature**

Update the POST `/start` handler body parsing:

```typescript
  const body = await c.req.json<{ classId: string; signature?: string }>();
```

After the `startRun` call, add:

```typescript
    if (body.signature) {
      storeStartSignature(run.id, body.signature);
    }
```

**Step 4: Add /finalize endpoint**

```typescript
// Finalize a run (seal score with wallet signature)
runs.post("/:id/finalize", async (c) => {
  const wallet = c.get("wallet");
  const runId = c.req.param("id");
  const body = await c.req.json<{ signature: string }>();

  const run = getActiveRun(wallet);
  // Allow finalizing both active and just-ended runs
  if (!run && runId) {
    // Run may have already ended (0 lives), store sig anyway
    storeEndSignature(runId, body.signature);
    return c.json({ finalized: true });
  }
  if (run && run.id === runId) {
    endRun(runId);
    storeEndSignature(runId, body.signature);
    return c.json({ finalized: true });
  }
  return c.json({ error: "RUN_NOT_FOUND", message: "Run not found" }, 404);
});
```

**Step 5: Also add a route to get inactive (ended) runs for the current week**

```typescript
// Get ended run for current week (for finalize screen)
runs.get("/ended", (c) => {
  const wallet = c.get("wallet");
  const { weekStart } = getWeekBounds();
  const row = db
    .prepare(
      "SELECT * FROM weekly_runs WHERE wallet_address = ? AND week_start = ? AND active = 0 ORDER BY created_at DESC LIMIT 1"
    )
    .get(wallet, weekStart) as any;
  return c.json(row ? mapRunFromRoute(row) : null);
});
```

This needs the `db` import and a local mapper. Alternatively, export a `getEndedRun` from `run-service.ts`:

In `run-service.ts`, add:

```typescript
export function getEndedRun(wallet: string): WeeklyRun | null {
  const { weekStart } = getWeekBounds();
  const row = db
    .prepare(
      "SELECT * FROM weekly_runs WHERE wallet_address = ? AND week_start = ? AND active = 0 ORDER BY created_at DESC LIMIT 1"
    )
    .get(wallet, weekStart) as any;
  if (!row) return null;
  return mapRun(row);
}
```

Then in `runs.ts`:

```typescript
import { getActiveRun, startRun, getLeaderboard, getEndedRun, storeStartSignature, storeEndSignature, endRun, getWeekBounds } from "../services/run-service.js";

runs.get("/ended", (c) => {
  const wallet = c.get("wallet");
  const run = getEndedRun(wallet);
  return c.json(run);
});
```

**Step 6: Commit**

```bash
git add apps/api/src/routes/runs.ts apps/api/src/services/run-service.ts
git commit -m "feat(api): add event listing, run finalize, and ended run endpoints"
```

---

### Task 7: Frontend — Enhanced RunStatus with week number + status badge

**Files:**
- Modify: `apps/web/src/features/game/RunStatus.tsx`

**Step 1: Rewrite RunStatus**

Replace the entire `RunStatus.tsx` content:

```tsx
import { Badge } from "@/components/ui/badge";
import { Zap, ShieldHalf, Sparkles, Heart, HeartCrack, Skull } from "lucide-react";
import type { WeeklyRun, ClassId, CharacterState } from "@solanaidle/shared";

interface Props {
  run: WeeklyRun;
  characterState?: CharacterState;
}

const CLASS_CONFIG: Record<ClassId, { icon: React.ReactNode; name: string }> = {
  scout: { icon: <Zap className="h-4 w-4 text-yellow-500" />, name: "Scout" },
  guardian: { icon: <ShieldHalf className="h-4 w-4 text-blue-500" />, name: "Guardian" },
  mystic: { icon: <Sparkles className="h-4 w-4 text-purple-500" />, name: "Mystic" },
};

function getWeekNumber(weekStart: string): number {
  const date = new Date(weekStart);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = date.getTime() - start.getTime();
  return Math.ceil((diff / 604800000) + 1);
}

function getRunStatusBadge(run: WeeklyRun, characterState?: CharacterState) {
  if (!run.active) {
    return <Badge variant="secondary" className="bg-muted text-muted-foreground">RUN OVER</Badge>;
  }
  if (characterState === "dead") {
    return <Badge variant="destructive" className="animate-pulse">DEAD</Badge>;
  }
  return <Badge className="bg-green-600 text-white">ALIVE</Badge>;
}

export function RunStatus({ run, characterState }: Props) {
  const cls = CLASS_CONFIG[run.classId];
  const weekNum = getWeekNumber(run.weekStart);
  const maxLives = run.classId === "guardian" ? 4 : 3; // Guardian's Iron Will not tracked here, use 3

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      {/* Top row: Week + Class + Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">Week {weekNum} Run</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {cls.icon}
            {cls.name}
          </span>
        </div>
        {getRunStatusBadge(run, characterState)}
      </div>

      {/* Bottom row: Lives + Score + Missions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }, (_, i) =>
            i < run.livesRemaining ? (
              <Heart key={i} className="h-4 w-4 fill-red-500 text-red-500" />
            ) : (
              <HeartCrack key={i} className="h-4 w-4 text-muted-foreground/40" />
            )
          )}
          {run.livesRemaining === 1 && (
            <span className="ml-1 text-xs font-bold text-red-500">LAST LIFE</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">Score: <span className="font-bold text-foreground">{run.score}</span></span>
          <span className="text-muted-foreground">Missions: <span className="font-bold text-foreground">{run.missionsCompleted}</span></span>
        </div>
      </div>

      {/* Stakes text */}
      {run.livesRemaining === 1 && run.active && characterState !== "dead" && (
        <div className="rounded bg-red-500/10 border border-red-500/30 px-2 py-1 text-center">
          <span className="text-xs font-bold text-red-500">FAILURE MEANS DEATH. 1 LIFE REMAINING.</span>
        </div>
      )}
      {run.livesRemaining === 2 && run.active && (
        <div className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-1 text-center">
          <span className="text-xs font-medium text-amber-500">Careful. 2 lives remaining.</span>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Update GameDashboard to pass characterState**

In `GameDashboard.tsx`, update the RunStatus usage:

```tsx
{activeRun && <RunStatus run={activeRun} characterState={character.state} />}
```

**Step 3: Commit**

```bash
git add apps/web/src/features/game/RunStatus.tsx apps/web/src/features/game/GameDashboard.tsx
git commit -m "feat(web): enhanced RunStatus with week number, status badges, stakes text"
```

---

### Task 8: Frontend — Dynamic risk labels on MissionPanel

**Files:**
- Modify: `apps/web/src/features/game/MissionPanel.tsx`

**Step 1: Rewrite MissionPanel with dynamic labels**

Replace the entire `MissionPanel.tsx`:

```tsx
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MissionType, CharacterState, MissionId, ClassId } from "@solanaidle/shared";
import { Clock, Skull, Lock, AlertTriangle } from "lucide-react";

interface Props {
  missions: MissionType[];
  characterState: CharacterState;
  onStart: (missionId: MissionId) => void;
  characterLevel?: number;
  classId?: ClassId | null;
  durationModifier?: number;
  livesRemaining?: number;
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 60)}m`;
}

// Dynamic label matrix
const RISK_LABELS: Record<string, Record<number, string>> = {
  scout:     { 3: "Safe Run",     2: "Careful Run",      1: "Last Chance" },
  expedition:{ 3: "Risky Expedition", 2: "High-Risk Mission", 1: "Suicide Mission" },
  deep_dive: { 3: "Dangerous Dive",  2: "Perilous Dive",    1: "Death Wish" },
  boss:      { 3: "Boss Fight",      2: "Do or Die",        1: "Final Stand" },
};

function getRiskLevel(missionId: string, lives: number): "safe" | "risky" | "dangerous" | "critical" {
  const failMap: Record<string, number> = { scout: 10, expedition: 25, deep_dive: 40, boss: 50 };
  const fail = failMap[missionId] ?? 10;
  if (lives === 1) return fail >= 25 ? "critical" : "dangerous";
  if (lives === 2) return fail >= 40 ? "dangerous" : "risky";
  if (fail >= 40) return "risky";
  return "safe";
}

const RISK_STYLES: Record<string, string> = {
  safe: "border-border",
  risky: "border-amber-500/50",
  dangerous: "border-red-500/50",
  critical: "border-red-500 bg-red-500/5",
};

export function MissionPanel({ missions, characterState, onStart, characterLevel = 1, classId, durationModifier = 1, livesRemaining = 3 }: Props) {
  const canStart = characterState === "idle";
  const lives = Math.max(1, Math.min(3, livesRemaining));

  const isTierLocked = (missionId: string): boolean => {
    if (missionId === "expedition" && characterLevel < 3) return true;
    if (missionId === "deep_dive" && characterLevel < 5) return true;
    if (missionId === "boss" && characterLevel < 5) return true;
    return false;
  };

  const getTierLabel = (missionId: string): string | null => {
    if (missionId === "expedition" && characterLevel < 3) return "Unlocks at Lv.3";
    if (missionId === "deep_dive" && characterLevel < 5) return "Unlocks at Lv.5";
    if (missionId === "boss" && characterLevel < 5) return "Unlocks at Lv.5";
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Missions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {missions.map((mission) => {
          const locked = isTierLocked(mission.id);
          const lockLabel = getTierLabel(mission.id);
          const displayDuration = Math.floor(mission.duration * durationModifier);
          const riskLevel = getRiskLevel(mission.id, lives);
          const dynamicLabel = RISK_LABELS[mission.id]?.[lives] ?? mission.name;

          return (
            <div
              key={mission.id}
              className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                locked ? "opacity-50 border-border" : RISK_STYLES[riskLevel]
              } ${riskLevel === "critical" && !locked ? "animate-pulse" : ""}`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  {riskLevel === "critical" && !locked && <Skull className="h-3.5 w-3.5 text-red-500" />}
                  <p className={`font-medium text-sm ${
                    riskLevel === "critical" && !locked ? "text-red-500" :
                    riskLevel === "dangerous" && !locked ? "text-red-400" :
                    riskLevel === "risky" && !locked ? "text-amber-500" : ""
                  }`}>
                    {locked ? mission.name : dynamicLabel}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(displayDuration)}
                  </span>
                  <span className={`flex items-center gap-1 ${
                    riskLevel === "critical" || riskLevel === "dangerous" ? "text-red-400 font-medium" :
                    riskLevel === "risky" ? "text-amber-400" : ""
                  }`}>
                    <AlertTriangle className="h-3 w-3" />
                    {mission.failRate}% chance of death
                  </span>
                </div>
                {lockLabel && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    <span>{lockLabel}</span>
                  </div>
                )}
              </div>
              <Button
                size="sm"
                disabled={!canStart || locked}
                onClick={() => onStart(mission.id)}
                variant={riskLevel === "critical" || riskLevel === "dangerous" ? "destructive" : "default"}
              >
                {locked ? "Locked" : "Start"}
              </Button>
            </div>
          );
        })}
        {!canStart && (
          <p className="text-xs text-muted-foreground text-center">
            {characterState === "on_mission"
              ? "Character is on a mission"
              : "Character is recovering"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Update GameDashboard to pass livesRemaining**

In `GameDashboard.tsx`, update MissionPanel:

```tsx
<MissionPanel
  missions={missions}
  characterState={character.state}
  onStart={startMission}
  characterLevel={character.level}
  classId={activeRun?.classId}
  livesRemaining={activeRun?.livesRemaining}
/>
```

**Step 3: Commit**

```bash
git add apps/web/src/features/game/MissionPanel.tsx apps/web/src/features/game/GameDashboard.tsx
git commit -m "feat(web): dynamic risk labels and death-chance text on mission cards"
```

---

### Task 9: Frontend — RunLog timeline component

**Files:**
- Create: `apps/web/src/features/game/RunLog.tsx`
- Modify: `apps/web/src/features/game/GameDashboard.tsx`

**Step 1: Create RunLog component**

```tsx
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Trophy,
  Skull,
  ArrowUp,
  Sparkles,
  Swords,
  Heart,
  ChevronDown,
  ChevronUp,
  Star,
  Gem,
} from "lucide-react";
import type { RunEvent, RunEventType } from "@solanaidle/shared";

interface Props {
  runId: string;
  weekStart: string;
}

const EVENT_ICONS: Record<RunEventType, React.ReactNode> = {
  run_start: <Swords className="h-3.5 w-3.5 text-blue-500" />,
  mission_success: <Trophy className="h-3.5 w-3.5 text-yellow-500" />,
  mission_fail: <Skull className="h-3.5 w-3.5 text-red-500" />,
  death: <Skull className="h-3.5 w-3.5 text-red-600" />,
  revive: <Heart className="h-3.5 w-3.5 text-green-500" />,
  level_up: <ArrowUp className="h-3.5 w-3.5 text-blue-400" />,
  boss_kill: <Star className="h-3.5 w-3.5 text-yellow-500" />,
  skill_unlock: <Sparkles className="h-3.5 w-3.5 text-purple-500" />,
  nft_drop: <Gem className="h-3.5 w-3.5 text-yellow-400" />,
  run_end: <Swords className="h-3.5 w-3.5 text-muted-foreground" />,
};

function getDayNumber(weekStart: string, eventDate: string): number {
  const start = new Date(weekStart).getTime();
  const event = new Date(eventDate).getTime();
  return Math.floor((event - start) / 86400000) + 1;
}

function formatEvent(event: RunEvent): string {
  const d = event.data as Record<string, any>;
  switch (event.eventType) {
    case "run_start":
      return `Run started as ${d.classId}`;
    case "mission_success":
      return `${d.missionId} succeeded. +${d.xp} XP, +${d.scrap} scrap${d.crystal ? `, +${d.crystal} crystal` : ""}`;
    case "mission_fail":
      return d.escaped
        ? `${d.missionId} failed — Lucky Escape!`
        : `${d.missionId} failed. Lost 1 life. (${d.livesRemaining} remaining)`;
    case "death":
      return "Died. Recovering...";
    case "revive":
      return "Revived.";
    case "level_up":
      return `Leveled up to Lv.${d.newLevel}`;
    case "boss_kill":
      return "Shadow Boss defeated!";
    case "skill_unlock":
      return `Unlocked: ${d.skillName}`;
    case "nft_drop":
      return `RARE: NFT Drop — ${d.nftName}!`;
    case "run_end":
      return `Run ended. ${d.cause === "death" ? "No lives remaining." : "Score sealed."}`;
    default:
      return event.eventType;
  }
}

export function RunLog({ runId, weekStart }: Props) {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    setLoading(true);
    api<RunEvent[]>(`/runs/${runId}/events`)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [runId, expanded]);

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-sm font-medium"
      >
        <span>Run Log</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && (
        <div className="border-t border-border px-3 pb-3 pt-2 space-y-1.5 max-h-60 overflow-y-auto">
          {loading && <p className="text-xs text-muted-foreground">Loading...</p>}
          {!loading && events.length === 0 && (
            <p className="text-xs text-muted-foreground">No events yet.</p>
          )}
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 shrink-0">{EVENT_ICONS[event.eventType]}</span>
              <div>
                <span className="text-muted-foreground">Day {getDayNumber(weekStart, event.createdAt)} — </span>
                <span className={
                  event.eventType === "nft_drop" ? "font-bold text-yellow-500" :
                  event.eventType === "mission_fail" || event.eventType === "death" ? "text-red-400" :
                  event.eventType === "boss_kill" ? "font-bold text-yellow-500" :
                  ""
                }>
                  {formatEvent(event)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add RunLog to GameDashboard**

In `GameDashboard.tsx`, add the import:

```tsx
import { RunLog } from "./RunLog";
```

In the game tab section, after the MissionPanel/MissionTimer block and before `{inventory && ...}`, add:

```tsx
{activeRun && (
  <RunLog runId={activeRun.id} weekStart={activeRun.weekStart} />
)}
```

**Step 3: Commit**

```bash
git add apps/web/src/features/game/RunLog.tsx apps/web/src/features/game/GameDashboard.tsx
git commit -m "feat(web): add collapsible RunLog timeline component"
```

---

### Task 10: Frontend — Wallet signature on ClassPicker (start run)

**Files:**
- Modify: `apps/web/src/features/game/ClassPicker.tsx`
- Modify: `apps/web/src/hooks/useGameState.ts`

**Step 1: Add useWalletSign hook**

Create `apps/web/src/hooks/useWalletSign.ts`:

```typescript
import { useConnector } from "@solana/connector";

export function useWalletSign() {
  const { selectedWallet } = useConnector();

  async function signMessage(message: string): Promise<string | null> {
    const signFeature =
      selectedWallet?.features?.["solana:signMessage"] ??
      selectedWallet?.features?.["standard:signMessage"];

    if (
      signFeature &&
      typeof (signFeature as { signMessage?: unknown }).signMessage === "function"
    ) {
      const messageBytes = new TextEncoder().encode(message);
      const result = await (
        signFeature as {
          signMessage: (opts: {
            message: Uint8Array;
            account: unknown;
          }) => Promise<{ signature: Uint8Array }>;
        }
      ).signMessage({
        message: messageBytes,
        account: selectedWallet?.accounts?.[0],
      });

      const bs58Module = await import("bs58");
      return bs58Module.default.encode(new Uint8Array(result.signature));
    }

    // Dev fallback: no signing available
    console.warn("[useWalletSign] signMessage not available, returning null");
    return null;
  }

  return { signMessage };
}
```

**Step 2: Update ClassPicker with confirmation dialog**

Replace `ClassPicker.tsx`:

```tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Zap, ShieldHalf, Sparkles, Loader2 } from "lucide-react";
import type { CharacterClass, ClassId } from "@solanaidle/shared";

interface Props {
  classes: CharacterClass[];
  onSelect: (classId: ClassId, signature?: string) => Promise<void>;
  signMessage: (msg: string) => Promise<string | null>;
}

const CLASS_ICONS: Record<ClassId, React.ReactNode> = {
  scout: <Zap className="h-6 w-6 text-yellow-500" />,
  guardian: <ShieldHalf className="h-6 w-6 text-blue-500" />,
  mystic: <Sparkles className="h-6 w-6 text-purple-500" />,
};

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const diff = now.getTime() - start.getTime();
  return Math.ceil(diff / 604800000 + 1);
}

export function ClassPicker({ classes, onSelect, signMessage }: Props) {
  const [selected, setSelected] = useState<ClassId | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [signing, setSigning] = useState(false);

  const selectedClass = classes.find((c) => c.id === selected);
  const weekNum = getWeekNumber();

  const handleClassClick = (classId: ClassId) => {
    setSelected(classId);
    setConfirming(true);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setSigning(true);
    try {
      const msg = `BEGIN_RUN:week${weekNum}:${selected}:${Date.now()}`;
      const signature = await signMessage(msg);
      await onSelect(selected, signature ?? undefined);
    } finally {
      setSigning(false);
      setConfirming(false);
      setSelected(null);
    }
  };

  const handleCancel = () => {
    setConfirming(false);
    setSelected(null);
  };

  const formatModifier = (value: number, isMultiplier: boolean) => {
    if (isMultiplier) {
      if (value === 1.0) return null;
      const pct = Math.round((value - 1) * 100);
      return pct > 0 ? `+${pct}%` : `${pct}%`;
    }
    if (value === 0) return null;
    return value > 0 ? `+${value}%` : `${value}%`;
  };

  return (
    <>
      <div className="mx-auto w-full max-w-md space-y-4 p-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Week {weekNum} Run</h2>
          <p className="text-sm text-muted-foreground">
            Choose your class. Each class has unique strengths and weaknesses.
          </p>
        </div>

        <div className="space-y-3">
          {classes.map((cls) => (
            <Card
              key={cls.id}
              className="cursor-pointer transition-colors hover:border-primary"
              onClick={() => handleClassClick(cls.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {CLASS_ICONS[cls.id]}
                  {cls.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{cls.description}</p>
                <div className="flex flex-wrap gap-1">
                  {formatModifier(cls.durationModifier, true) && (
                    <Badge variant={cls.durationModifier < 1 ? "default" : "destructive"}>
                      {cls.durationModifier < 1 ? "Speed" : "Slow"}: {formatModifier(cls.durationModifier, true)}
                    </Badge>
                  )}
                  {formatModifier(cls.failRateModifier, false) && (
                    <Badge variant={cls.failRateModifier < 0 ? "default" : "destructive"}>
                      Fail: {formatModifier(cls.failRateModifier, false)}
                    </Badge>
                  )}
                  {formatModifier(cls.lootModifier, true) && (
                    <Badge variant={cls.lootModifier > 1 ? "default" : "destructive"}>
                      Loot: {formatModifier(cls.lootModifier, true)}
                    </Badge>
                  )}
                  {formatModifier(cls.xpModifier, true) && (
                    <Badge variant={cls.xpModifier > 1 ? "default" : "destructive"}>
                      XP: {formatModifier(cls.xpModifier, true)}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirming} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="items-center text-center">
            {selected && CLASS_ICONS[selected]}
            <DialogTitle className="text-xl">Commit to This Run</DialogTitle>
            <DialogDescription>
              You are about to begin Week {weekNum} as a <strong>{selectedClass?.name}</strong>. 3 lives. No turning back.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleConfirm} disabled={signing} className="w-full">
              {signing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing...</>
              ) : (
                "Sign & Begin"
              )}
            </Button>
            <Button variant="ghost" onClick={handleCancel} disabled={signing} className="w-full">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

**Step 3: Update useGameState to pass signature**

In `useGameState.ts`, update the `startRun` callback:

```typescript
  const startRun = useCallback(
    async (classId: ClassId, signature?: string) => {
      await api("/runs/start", {
        method: "POST",
        body: JSON.stringify({ classId, signature }),
      });
      await refresh();
    },
    [refresh],
  );
```

**Step 4: Update GameDashboard to pass signMessage**

In `GameDashboard.tsx`, add:

```tsx
import { useWalletSign } from "@/hooks/useWalletSign";
```

Inside the component:

```tsx
const { signMessage } = useWalletSign();
```

Update ClassPicker usage:

```tsx
return <ClassPicker classes={classes} onSelect={startRun} signMessage={signMessage} />;
```

**Step 5: Commit**

```bash
git add apps/web/src/hooks/useWalletSign.ts apps/web/src/features/game/ClassPicker.tsx apps/web/src/hooks/useGameState.ts apps/web/src/features/game/GameDashboard.tsx
git commit -m "feat(web): wallet signature ceremony on run start"
```

---

### Task 11: Frontend — RunEndScreen with wallet signature

**Files:**
- Create: `apps/web/src/features/game/RunEndScreen.tsx`
- Modify: `apps/web/src/features/game/GameDashboard.tsx`
- Modify: `apps/web/src/hooks/useGameState.ts`

**Step 1: Create RunEndScreen**

```tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import {
  Trophy,
  Skull,
  Swords,
  Loader2,
  Zap,
  ShieldHalf,
  Sparkles,
} from "lucide-react";
import type { WeeklyRun, RunEvent, ClassId } from "@solanaidle/shared";

interface Props {
  run: WeeklyRun;
  signMessage: (msg: string) => Promise<string | null>;
  onFinalized: () => void;
}

const CLASS_ICONS: Record<ClassId, React.ReactNode> = {
  scout: <Zap className="h-8 w-8 text-yellow-500" />,
  guardian: <ShieldHalf className="h-8 w-8 text-blue-500" />,
  mystic: <Sparkles className="h-8 w-8 text-purple-500" />,
};

function getWeekNumber(weekStart: string): number {
  const date = new Date(weekStart);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = date.getTime() - start.getTime();
  return Math.ceil(diff / 604800000 + 1);
}

export function RunEndScreen({ run, signMessage, onFinalized }: Props) {
  const [signing, setSigning] = useState(false);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const weekNum = getWeekNumber(run.weekStart);

  useEffect(() => {
    api<RunEvent[]>(`/runs/${run.id}/events`)
      .then(setEvents)
      .catch(() => {});
  }, [run.id]);

  const deaths = events.filter((e) => e.eventType === "mission_fail" && !(e.data as any).escaped).length;

  const handleFinalize = async () => {
    setSigning(true);
    try {
      const msg = `END_RUN:week${weekNum}:score:${run.score}:${Date.now()}`;
      const signature = await signMessage(msg);
      await api(`/runs/${run.id}/finalize`, {
        method: "POST",
        body: JSON.stringify({ signature: signature ?? "dev-unsigned" }),
      });
      onFinalized();
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-6 p-4">
      <div className="text-center space-y-3">
        <Skull className="h-16 w-16 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold">Run Over</h2>
        <p className="text-sm text-muted-foreground">
          Week {weekNum} has ended. Seal your score on the leaderboard.
        </p>
      </div>

      {/* Run summary */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-center gap-2">
          {CLASS_ICONS[run.classId]}
          <span className="font-bold text-lg">
            {run.classId.charAt(0).toUpperCase() + run.classId.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center text-sm">
          <div className="rounded bg-muted/50 p-2">
            <div className="text-muted-foreground text-xs">Final Score</div>
            <div className="font-bold text-lg">{run.score}</div>
          </div>
          <div className="rounded bg-muted/50 p-2">
            <div className="text-muted-foreground text-xs">Missions</div>
            <div className="font-bold text-lg">{run.missionsCompleted}</div>
          </div>
          <div className="rounded bg-muted/50 p-2">
            <div className="text-muted-foreground text-xs">Deaths</div>
            <div className="font-bold text-lg text-red-500">{deaths}</div>
          </div>
          <div className="rounded bg-muted/50 p-2">
            <div className="text-muted-foreground text-xs">Boss</div>
            <div className="font-bold text-lg">
              {run.bossDefeated ? (
                <Badge className="bg-yellow-500 text-black">Defeated</Badge>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seal button */}
      <Button onClick={handleFinalize} disabled={signing} className="w-full" size="lg">
        {signing ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing...</>
        ) : (
          "Seal Your Fate"
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Sign with your wallet to finalize this score on the leaderboard.
      </p>
    </div>
  );
}
```

**Step 2: Wire into GameDashboard**

In `useGameState.ts`, add state for ended run detection. Add to GameState:

```typescript
  endedRun: WeeklyRun | null;
```

In the refresh function, add a fetch for ended runs when no active run exists:

```typescript
      let endedRun: WeeklyRun | null = null;
      if (!runData) {
        try {
          endedRun = await api<WeeklyRun | null>("/runs/ended");
          // Only show if not yet finalized (no end_signature)
          if (endedRun?.endSignature) endedRun = null;
        } catch { endedRun = null; }
      }
```

Add to setState: `endedRun,`

Add a `finalizeRun` callback:

```typescript
  const finalizeRun = useCallback(async () => {
    await refresh();
  }, [refresh]);
```

Return `endedRun` and `finalizeRun` from the hook.

In `GameDashboard.tsx`, destructure `endedRun`:

```tsx
const { ..., endedRun } = useGameState(isAuthenticated);
```

Add the RunEndScreen check after the ClassPicker check:

```tsx
import { RunEndScreen } from "./RunEndScreen";

// After the !activeRun && classes check:
if (!activeRun && endedRun && !endedRun.endSignature) {
  return <RunEndScreen run={endedRun} signMessage={signMessage} onFinalized={refresh} />;
}
```

**Step 3: Commit**

```bash
git add apps/web/src/features/game/RunEndScreen.tsx apps/web/src/features/game/GameDashboard.tsx apps/web/src/hooks/useGameState.ts
git commit -m "feat(web): RunEndScreen with wallet signature ceremony"
```

---

### Task 12: Enhanced MissionResultDialog

**Files:**
- Modify: `apps/web/src/features/game/MissionResultDialog.tsx`

**Step 1: Enhance failure messaging with stakes**

Replace `MissionResultDialog.tsx`:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MissionClaimResponse } from "@solanaidle/shared";
import { Trophy, Skull, Sparkles, Heart, HeartCrack } from "lucide-react";

interface Props {
  result: MissionClaimResponse | null;
  onClose: () => void;
  livesRemaining?: number;
}

export function MissionResultDialog({ result, onClose, livesRemaining }: Props) {
  if (!result) return null;

  const isSuccess = result.result === "success";
  const isRunOver = livesRemaining !== undefined && livesRemaining <= 0;

  return (
    <Dialog open={!!result} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center">
          {isSuccess ? (
            <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
          ) : (
            <Skull className="h-12 w-12 text-red-500 mx-auto mb-2" />
          )}
          <DialogTitle className="text-xl">
            {isSuccess
              ? "Mission Success!"
              : isRunOver
              ? "DEATH — Run Over"
              : "Mission Failed"}
          </DialogTitle>
          <DialogDescription>
            {isSuccess
              ? "Your character returned with loot!"
              : isRunOver
              ? "No lives remaining. Your run has ended."
              : "Your character didn't make it back..."}
          </DialogDescription>
        </DialogHeader>

        {isSuccess && result.rewards && (
          <div className="space-y-2 py-2">
            <p className="text-sm font-medium text-center">Rewards:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary">+{result.rewards.xp} XP</Badge>
              <Badge variant="secondary">+{result.rewards.scrap} Scrap</Badge>
              {result.rewards.crystal ? (
                <Badge variant="secondary">+{result.rewards.crystal} Crystal</Badge>
              ) : null}
              {result.rewards.artifact ? (
                <Badge variant="secondary">+{result.rewards.artifact} Artifact</Badge>
              ) : null}
            </div>
          </div>
        )}

        {result.nftDrop && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium">NFT Drop: {result.nftDrop.nftName}</span>
          </div>
        )}

        {!isSuccess && !isRunOver && livesRemaining !== undefined && (
          <div className="flex items-center justify-center gap-2 py-2">
            {Array.from({ length: 3 }, (_, i) =>
              i < livesRemaining ? (
                <Heart key={i} className="h-5 w-5 fill-red-500 text-red-500" />
              ) : (
                <HeartCrack key={i} className="h-5 w-5 text-muted-foreground/40" />
              )
            )}
          </div>
        )}

        {!isSuccess && !isRunOver && (
          <p className="text-center text-sm text-muted-foreground">
            Character is recovering. Check back in 1 hour.
          </p>
        )}

        <DialogFooter>
          <Button onClick={onClose} className="w-full" variant={isRunOver ? "destructive" : "default"}>
            {isSuccess ? "Continue" : isRunOver ? "View Results" : "Understood"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Pass livesRemaining from GameDashboard**

In `GameDashboard.tsx`, update:

```tsx
<MissionResultDialog
  result={lastClaimResult}
  onClose={clearClaimResult}
  livesRemaining={activeRun?.livesRemaining}
/>
```

**Step 3: Commit**

```bash
git add apps/web/src/features/game/MissionResultDialog.tsx apps/web/src/features/game/GameDashboard.tsx
git commit -m "feat(web): enhanced MissionResultDialog with death stakes and lives display"
```

---

### Task 13: Build & smoke test

**Step 1: Build both packages**

Run: `pnpm build`

Expected: No TypeScript errors, clean build.

**Step 2: Start dev servers**

Run: `pnpm dev`

**Step 3: Manual smoke test**

1. Connect wallet → should see class picker with "Week N Run" title
2. Pick a class → confirmation dialog should appear → "Sign & Begin"
3. Start a scout mission → should see "Safe Run" label (or dynamic based on lives)
4. Complete mission → check RunLog expands and shows event
5. If failure → check "X% chance of death" text, lives display in result dialog
6. Verify RunStatus shows correct week number, status badge, and stakes text

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address smoke test issues"
```

---
