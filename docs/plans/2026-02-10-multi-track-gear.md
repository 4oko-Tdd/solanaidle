# Multi-Track Gear Upgrade System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace single gear level with 3 independent upgrade tracks (Armor, Engine, Scanner) stored on weekly runs, resetting each week.

**Architecture:** Add 3 columns to `weekly_runs` table. New shared types replace old `UpgradeInfo`. Upgrade service reads/writes run-level gear. Mission service applies all 3 bonuses (fail rate, duration, loot). Frontend UpgradePanel becomes a 3-column picker.

**Tech Stack:** SQLite migrations, TypeScript shared types, Hono routes, React components

---

### Task 1: Update shared types

**Files:**
- Modify: `packages/shared/src/types.ts`

Replace old upgrade types with multi-track system. Keep `UpgradeCost` as-is (already correct). Replace `UpgradeInfo`.

**Step 1: Update types**

In `packages/shared/src/types.ts`, replace the Upgrades section:

```ts
// Old (remove):
export interface UpgradeInfo {
  currentGearLevel: number;
  nextUpgrade: {
    level: number;
    cost: UpgradeCost;
    failRateReduction: number;
    canAfford: boolean;
  } | null;
}

// New (add):
export type GearTrack = "armor" | "engine" | "scanner";

export interface TrackInfo {
  level: number;
  maxLevel: number;
  effectLabel: string;    // e.g. "-5% fail rate"
  next: {
    level: number;
    cost: UpgradeCost;
    effectLabel: string;  // e.g. "-8% fail rate"
    canAfford: boolean;
  } | null;
}

export interface UpgradeInfo {
  armor: TrackInfo;
  engine: TrackInfo;
  scanner: TrackInfo;
}
```

Also update `WeeklyRun` interface — add 3 fields:

```ts
  armorLevel: number;
  engineLevel: number;
  scannerLevel: number;
```

Remove `gearLevel` from `Character` interface.

**Step 2: Build to verify types compile**

Run: `pnpm build`
Expected: Build errors in files that reference old types (this is fine, we fix them in later tasks)

**Step 3: Commit**

```bash
git add packages/shared/src/types.ts
git commit -m "feat: update shared types for multi-track gear system"
```

---

### Task 2: Database migration + game config

**Files:**
- Modify: `apps/api/src/db/schema.ts` (add 3 columns to weekly_runs migration)
- Modify: `apps/api/src/services/game-config.ts` (add ENGINE_UPGRADES, SCANNER_UPGRADES, helper functions)

**Step 1: Add migration in schema.ts**

After the existing `streak` migration block (line ~138), add:

```ts
if (!colNames.includes("armor_level")) {
  db.exec("ALTER TABLE weekly_runs ADD COLUMN armor_level INTEGER NOT NULL DEFAULT 0");
}
if (!colNames.includes("engine_level")) {
  db.exec("ALTER TABLE weekly_runs ADD COLUMN engine_level INTEGER NOT NULL DEFAULT 0");
}
if (!colNames.includes("scanner_level")) {
  db.exec("ALTER TABLE weekly_runs ADD COLUMN scanner_level INTEGER NOT NULL DEFAULT 0");
}
```

**Step 2: Add upgrade track configs in game-config.ts**

Keep existing `GEAR_UPGRADES` renamed to `ARMOR_UPGRADES`. Add two new arrays. Add helper functions.

```ts
export const ARMOR_UPGRADES = [
  { level: 1, cost: { scrap: 10 }, failRateReduction: 2 },
  { level: 2, cost: { scrap: 25, crystal: 5 }, failRateReduction: 3 },
  { level: 3, cost: { scrap: 50, crystal: 15 }, failRateReduction: 5 },
  { level: 4, cost: { scrap: 100, crystal: 30, artifact: 1 }, failRateReduction: 8 },
  { level: 5, cost: { scrap: 200, crystal: 60, artifact: 3 }, failRateReduction: 12 },
];

export const ENGINE_UPGRADES = [
  { level: 1, cost: { scrap: 10 }, durationReduction: 0.05 },
  { level: 2, cost: { scrap: 25, crystal: 5 }, durationReduction: 0.08 },
  { level: 3, cost: { scrap: 50, crystal: 15 }, durationReduction: 0.12 },
  { level: 4, cost: { scrap: 100, crystal: 30, artifact: 1 }, durationReduction: 0.16 },
  { level: 5, cost: { scrap: 200, crystal: 60, artifact: 3 }, durationReduction: 0.20 },
];

export const SCANNER_UPGRADES = [
  { level: 1, cost: { scrap: 10 }, lootBonus: 0.05 },
  { level: 2, cost: { scrap: 25, crystal: 5 }, lootBonus: 0.10 },
  { level: 3, cost: { scrap: 50, crystal: 15 }, lootBonus: 0.15 },
  { level: 4, cost: { scrap: 100, crystal: 30, artifact: 1 }, lootBonus: 0.20 },
  { level: 5, cost: { scrap: 200, crystal: 60, artifact: 3 }, lootBonus: 0.30 },
];

export const MAX_TRACK_LEVEL = 5;

export function getArmorReduction(level: number): number {
  if (level <= 0) return 0;
  const u = ARMOR_UPGRADES.find(u => u.level === level);
  return u?.failRateReduction ?? 0;
}

export function getEngineReduction(level: number): number {
  if (level <= 0) return 0;
  const u = ENGINE_UPGRADES.find(u => u.level === level);
  return u?.durationReduction ?? 0;
}

export function getScannerBonus(level: number): number {
  if (level <= 0) return 0;
  const u = SCANNER_UPGRADES.find(u => u.level === level);
  return u?.lootBonus ?? 0;
}
```

Remove old `GEAR_UPGRADES`, `MAX_GEAR_LEVEL`, `getGearUpgrade`, `getFailRateReduction` (or keep as aliases if needed temporarily).

**Step 3: Commit**

```bash
git add apps/api/src/db/schema.ts apps/api/src/services/game-config.ts
git commit -m "feat: add gear track DB migration and config constants"
```

---

### Task 3: Rewrite upgrade-service.ts

**Files:**
- Modify: `apps/api/src/services/upgrade-service.ts`

**Step 1: Rewrite the service**

Replace entire file with multi-track logic:

```ts
import db from "../db/database.js";
import {
  ARMOR_UPGRADES, ENGINE_UPGRADES, SCANNER_UPGRADES,
  MAX_TRACK_LEVEL,
  getArmorReduction, getEngineReduction, getScannerBonus,
} from "./game-config.js";
import type { Inventory, UpgradeInfo, TrackInfo, GearTrack } from "@solanaidle/shared";

const TRACK_CONFIGS = {
  armor: {
    upgrades: ARMOR_UPGRADES,
    column: "armor_level",
    effectLabel: (level: number) => level > 0 ? `-${getArmorReduction(level)}% fail rate` : "No bonus",
    nextEffectLabel: (level: number) => `-${getArmorReduction(level)}% fail rate`,
  },
  engine: {
    upgrades: ENGINE_UPGRADES,
    column: "engine_level",
    effectLabel: (level: number) => level > 0 ? `-${Math.round(getEngineReduction(level) * 100)}% duration` : "No bonus",
    nextEffectLabel: (level: number) => `-${Math.round(getEngineReduction(level) * 100)}% duration`,
  },
  scanner: {
    upgrades: SCANNER_UPGRADES,
    column: "scanner_level",
    effectLabel: (level: number) => level > 0 ? `+${Math.round(getScannerBonus(level) * 100)}% loot` : "No bonus",
    nextEffectLabel: (level: number) => `+${Math.round(getScannerBonus(level) * 100)}% loot`,
  },
} as const;

function getTrackInfo(track: GearTrack, currentLevel: number, characterId: string): TrackInfo {
  const config = TRACK_CONFIGS[track];
  if (currentLevel >= MAX_TRACK_LEVEL) {
    return {
      level: currentLevel,
      maxLevel: MAX_TRACK_LEVEL,
      effectLabel: config.effectLabel(currentLevel),
      next: null,
    };
  }

  const nextUpgrade = config.upgrades.find(u => u.level === currentLevel + 1)!;
  const inv = db.prepare(
    "SELECT scrap, crystal, artifact FROM inventories WHERE character_id = ?"
  ).get(characterId) as Inventory;

  const canAfford =
    inv.scrap >= nextUpgrade.cost.scrap &&
    inv.crystal >= (nextUpgrade.cost.crystal ?? 0) &&
    inv.artifact >= (nextUpgrade.cost.artifact ?? 0);

  return {
    level: currentLevel,
    maxLevel: MAX_TRACK_LEVEL,
    effectLabel: config.effectLabel(currentLevel),
    next: {
      level: nextUpgrade.level,
      cost: nextUpgrade.cost,
      effectLabel: config.nextEffectLabel(nextUpgrade.level),
      canAfford,
    },
  };
}

export function getUpgradeInfo(characterId: string, runId: string): UpgradeInfo {
  const run = db.prepare(
    "SELECT armor_level, engine_level, scanner_level FROM weekly_runs WHERE id = ?"
  ).get(runId) as { armor_level: number; engine_level: number; scanner_level: number } | undefined;

  const armorLvl = run?.armor_level ?? 0;
  const engineLvl = run?.engine_level ?? 0;
  const scannerLvl = run?.scanner_level ?? 0;

  return {
    armor: getTrackInfo("armor", armorLvl, characterId),
    engine: getTrackInfo("engine", engineLvl, characterId),
    scanner: getTrackInfo("scanner", scannerLvl, characterId),
  };
}

export function upgradeTrack(
  characterId: string,
  runId: string,
  track: GearTrack
): { levels: { armor: number; engine: number; scanner: number }; inventory: Inventory } {
  const config = TRACK_CONFIGS[track];

  const run = db.prepare(
    `SELECT ${config.column} as level FROM weekly_runs WHERE id = ?`
  ).get(runId) as { level: number } | undefined;
  if (!run) throw new Error("RUN_NOT_FOUND");

  const currentLevel = run.level;
  if (currentLevel >= MAX_TRACK_LEVEL) throw new Error("MAX_LEVEL");

  const nextUpgrade = config.upgrades.find(u => u.level === currentLevel + 1)!;
  const inv = db.prepare(
    "SELECT scrap, crystal, artifact FROM inventories WHERE character_id = ?"
  ).get(characterId) as Inventory;

  const canAfford =
    inv.scrap >= nextUpgrade.cost.scrap &&
    inv.crystal >= (nextUpgrade.cost.crystal ?? 0) &&
    inv.artifact >= (nextUpgrade.cost.artifact ?? 0);
  if (!canAfford) throw new Error("INSUFFICIENT_RESOURCES");

  // Deduct cost
  db.prepare(
    "UPDATE inventories SET scrap = scrap - ?, crystal = crystal - ?, artifact = artifact - ? WHERE character_id = ?"
  ).run(nextUpgrade.cost.scrap, nextUpgrade.cost.crystal ?? 0, nextUpgrade.cost.artifact ?? 0, characterId);

  // Increment level on run
  db.prepare(
    `UPDATE weekly_runs SET ${config.column} = ? WHERE id = ?`
  ).run(currentLevel + 1, runId);

  // Return updated state
  const updatedRun = db.prepare(
    "SELECT armor_level, engine_level, scanner_level FROM weekly_runs WHERE id = ?"
  ).get(runId) as any;
  const updatedInv = db.prepare(
    "SELECT scrap, crystal, artifact FROM inventories WHERE character_id = ?"
  ).get(characterId) as Inventory;

  return {
    levels: {
      armor: updatedRun.armor_level,
      engine: updatedRun.engine_level,
      scanner: updatedRun.scanner_level,
    },
    inventory: updatedInv,
  };
}
```

**Step 2: Commit**

```bash
git add apps/api/src/services/upgrade-service.ts
git commit -m "feat: rewrite upgrade service for multi-track gear"
```

---

### Task 4: Update API routes + mission service

**Files:**
- Modify: `apps/api/src/routes/upgrades.ts` (new `:track` param, use run instead of character gear)
- Modify: `apps/api/src/services/mission-service.ts` (apply engine + scanner bonuses, remove old gearLevel references)
- Modify: `apps/api/src/services/run-service.ts` (add gear levels to mapRun)

**Step 1: Rewrite upgrades route**

```ts
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
import { getUpgradeInfo, upgradeTrack } from "../services/upgrade-service.js";
import { getActiveRun } from "../services/run-service.js";
import type { GearTrack } from "@solanaidle/shared";

type Env = { Variables: { wallet: string } };

const upgrades = new Hono<Env>();
upgrades.use("*", authMiddleware);

const VALID_TRACKS: GearTrack[] = ["armor", "engine", "scanner"];

upgrades.get("/", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND" }, 404);

  const run = getActiveRun(wallet);
  if (!run) return c.json({ armor: { level: 0, maxLevel: 5, effectLabel: "No bonus", next: null }, engine: { level: 0, maxLevel: 5, effectLabel: "No bonus", next: null }, scanner: { level: 0, maxLevel: 5, effectLabel: "No bonus", next: null } });

  const info = getUpgradeInfo(char.id, run.id);
  return c.json(info);
});

upgrades.post("/:track", (c) => {
  const wallet = c.get("wallet");
  const track = c.req.param("track") as GearTrack;
  if (!VALID_TRACKS.includes(track)) return c.json({ error: "INVALID_TRACK" }, 400);

  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND" }, 404);

  const run = getActiveRun(wallet);
  if (!run) return c.json({ error: "NO_ACTIVE_RUN" }, 400);

  try {
    const result = upgradeTrack(char.id, run.id, track);
    return c.json(result);
  } catch (e: any) {
    if (e.message === "MAX_LEVEL") return c.json({ error: "MAX_LEVEL" }, 400);
    if (e.message === "INSUFFICIENT_RESOURCES") return c.json({ error: "INSUFFICIENT_RESOURCES" }, 400);
    throw e;
  }
});

export default upgrades;
```

**Step 2: Update mission-service.ts**

In `claimMission` function signature, change `gearLevel: number` to `runId: string` (runId is already passed). Read gear levels from the run inside the function:

- Replace `getFailRateReduction(gearLevel)` with reading `armor_level` from weekly_runs and using `getArmorReduction(armorLevel)`.
- After class loot modifier block, add scanner bonus block: read `scanner_level` from run, apply `getScannerBonus()` multiplier to scrap/crystal/artifact.
- In `startMission`, read `engine_level` from run and apply `getEngineReduction()` to duration.
- Remove `gearLevel` from `claimMission` params, read it from the run row instead.
- Update `mapCharacter` to remove `gearLevel` field.

**Step 3: Update run-service.ts mapRun**

Add the 3 gear fields to `mapRun`:

```ts
armorLevel: row.armor_level ?? 0,
engineLevel: row.engine_level ?? 0,
scannerLevel: row.scanner_level ?? 0,
```

**Step 4: Commit**

```bash
git add apps/api/src/routes/upgrades.ts apps/api/src/services/mission-service.ts apps/api/src/services/run-service.ts
git commit -m "feat: update API routes and mission service for multi-track gear"
```

---

### Task 5: Update frontend hook + UpgradePanel

**Files:**
- Modify: `apps/web/src/hooks/useGameState.ts` (change `upgradeGear` to `upgradeTrack`)
- Rewrite: `apps/web/src/features/game/UpgradePanel.tsx` (3-column layout)

**Step 1: Update useGameState.ts**

Change the `upgradeGear` callback:

```ts
const upgradeTrack = useCallback(async (track: GearTrack) => {
  await api(`/upgrades/${track}`, { method: "POST" });
  await refresh();
}, [refresh]);
```

Update the return to export `upgradeTrack` instead of `upgradeGear`. Add `GearTrack` to imports from shared.

**Step 2: Rewrite UpgradePanel.tsx**

3-column card layout with Shield/Zap/Search icons. Each column shows: icon + name, current level/max, current effect, next effect preview, cost with currency icons, upgrade button. Uses `animate-scale-pop` on success. Disabled when maxed or can't afford.

**Step 3: Update GameDashboard.tsx**

Change `onUpgrade={upgradeGear}` to `onUpgrade={upgradeTrack}`. Update the `UpgradePanel` props interface.

**Step 4: Update CharacterCard.tsx**

Replace single "Gear Lv.X" display with 3 small icons showing each track level. Read from `activeRun.armorLevel` etc instead of `character.gearLevel`.

**Step 5: Build and verify**

Run: `pnpm build`
Expected: Clean build

**Step 6: Commit**

```bash
git add apps/web/src/hooks/useGameState.ts apps/web/src/features/game/UpgradePanel.tsx apps/web/src/features/game/GameDashboard.tsx apps/web/src/features/game/CharacterCard.tsx
git commit -m "feat: multi-track gear upgrade UI with 3-column panel"
```

---

### Task 6: Clean up old gear references

**Files:**
- Modify: any remaining files referencing `gearLevel`, `gear_level`, `upgradeGear`, `GEAR_UPGRADES`

**Step 1: Search and clean**

```bash
grep -r "gearLevel\|gear_level\|GEAR_UPGRADES\|MAX_GEAR_LEVEL\|upgradeGear\|getFailRateReduction\|getGearUpgrade" --include="*.ts" --include="*.tsx" apps/ packages/
```

Remove or update all remaining references. Key files likely:
- `apps/api/src/routes/missions.ts` — may pass `char.gearLevel` to `claimMission()`
- `apps/api/src/services/character-service.ts` — may return `gearLevel`
- Any route that reads character gear level for the claim call

**Step 2: Build**

Run: `pnpm build`
Expected: Clean build, zero references to old gear system

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove all old single-gear references"
```
