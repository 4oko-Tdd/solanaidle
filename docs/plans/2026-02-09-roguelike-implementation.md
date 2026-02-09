# Roguelike Viral Mechanics — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add weekly runs, character classes (Scout/Guardian/Mystic) with skill trees, guild system with raid missions, and weekly leaderboard to the existing idle game MVP.

**Architecture:** Extend existing SQLite schema with new tables for runs, classes, skills, guilds, raids. Modify existing mission/character services to be run-aware and class-aware. Add new guild/raid route group. Frontend gets class picker, skill tree, guild panel, run status, and leaderboard.

**Tech Stack:** Same stack — Hono + SQLite + React + Tailwind + shadcn/ui. No new dependencies.

---

## Phase 1: Backend — Schema & Types

### Task 1: Extend shared types

**Files:**
- Modify: `packages/shared/src/types.ts`

Add these types to the existing file (append, don't replace):

```typescript
// ── Character Classes ──

export type ClassId = "scout" | "guardian" | "mystic";

export interface CharacterClass {
  id: ClassId;
  name: string;
  description: string;
  durationModifier: number;   // multiplier (0.85 = 15% faster)
  failRateModifier: number;   // additive (5 = +5% fail)
  lootModifier: number;       // multiplier (1.3 = +30% rare loot)
  xpModifier: number;         // multiplier (0.9 = -10% XP)
}

// ── Skill Trees ──

export interface SkillNode {
  id: string;
  classId: ClassId;
  name: string;
  description: string;
  tier: number; // 1, 2, 3
  cost: number; // skill points
}

export interface UnlockedSkill {
  skillId: string;
  unlockedAt: string;
}

// ── Weekly Runs ──

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
}

// ── Guilds ──

export interface Guild {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  memberCount: number;
}

export interface GuildMember {
  walletAddress: string;
  characterId: string;
  joinedAt: string;
}

// ── Raids ──

export type RaidId = "outpost" | "stronghold";

export interface RaidMission {
  id: RaidId;
  name: string;
  requiredPlayers: number;
  duration: number;
  lootMultiplier: number;
  description: string;
}

export interface ActiveRaid {
  id: string;
  raidId: RaidId;
  guildId: string;
  startedAt: string;
  endsAt: string;
  committedPlayers: string[]; // wallet addresses
  timeRemaining?: number;
}

// ── Leaderboard ──

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  classId: ClassId;
  score: number;
  missionsCompleted: number;
  bossDefeated: boolean;
}

// ── Extended Character (adds class & run info) ──

export interface CharacterWithRun extends Character {
  classId: ClassId | null;
  activeRun: WeeklyRun | null;
  skills: UnlockedSkill[];
}
```

Also extend `MissionId` type:
```typescript
export type MissionId = "scout" | "expedition" | "deep_dive" | "boss";
```

Add new error codes to `ErrorCode`:
```typescript
  | "NO_ACTIVE_RUN"
  | "RUN_ENDED"
  | "CLASS_ALREADY_CHOSEN"
  | "INSUFFICIENT_SKILL_POINTS"
  | "SKILL_ALREADY_UNLOCKED"
  | "SKILL_PREREQUISITE"
  | "GUILD_NOT_FOUND"
  | "GUILD_FULL"
  | "ALREADY_IN_GUILD"
  | "NOT_IN_GUILD"
  | "RAID_IN_PROGRESS"
  | "RAID_NOT_READY"
  | "NO_LIVES"
  | "BOSS_NOT_AVAILABLE"
```

**Commit:** `feat(shared): add types for classes, runs, guilds, raids, leaderboard`

---

### Task 2: Extend database schema

**Files:**
- Modify: `apps/api/src/db/schema.ts`

Add new tables to `initSchema()`:

```sql
CREATE TABLE IF NOT EXISTS weekly_runs (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  class_id TEXT NOT NULL CHECK(class_id IN ('scout', 'guardian', 'mystic')),
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,
  lives_remaining INTEGER NOT NULL DEFAULT 3,
  score INTEGER NOT NULL DEFAULT 0,
  skill_points INTEGER NOT NULL DEFAULT 0,
  missions_completed INTEGER NOT NULL DEFAULT 0,
  boss_defeated INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS unlocked_skills (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES weekly_runs(id),
  skill_id TEXT NOT NULL,
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(run_id, skill_id)
);

CREATE TABLE IF NOT EXISTS guilds (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS guild_members (
  guild_id TEXT NOT NULL REFERENCES guilds(id),
  wallet_address TEXT NOT NULL,
  character_id TEXT NOT NULL REFERENCES characters(id),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (guild_id, wallet_address)
);

CREATE TABLE IF NOT EXISTS active_raids (
  id TEXT PRIMARY KEY,
  raid_id TEXT NOT NULL,
  guild_id TEXT NOT NULL REFERENCES guilds(id),
  started_at TEXT NOT NULL,
  ends_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS raid_participants (
  raid_id TEXT NOT NULL REFERENCES active_raids(id),
  wallet_address TEXT NOT NULL,
  character_id TEXT NOT NULL REFERENCES characters(id),
  PRIMARY KEY (raid_id, wallet_address)
);

CREATE TABLE IF NOT EXISTS leaderboard (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  class_id TEXT NOT NULL,
  week_start TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  missions_completed INTEGER NOT NULL DEFAULT 0,
  boss_defeated INTEGER NOT NULL DEFAULT 0,
  UNIQUE(wallet_address, week_start)
);
```

**Commit:** `feat(api): add schema for runs, skills, guilds, raids, leaderboard`

---

## Phase 2: Backend — Game Config & Services

### Task 3: Class & skill config

**Files:**
- Modify: `apps/api/src/services/game-config.ts`

Add to existing config (append, don't replace):

```typescript
import type { CharacterClass, SkillNode, RaidMission } from "@solanaidle/shared";

export const CLASSES: CharacterClass[] = [
  {
    id: "scout",
    name: "Scout",
    description: "Speed runner. Faster missions, slightly riskier.",
    durationModifier: 0.85,
    failRateModifier: 5,
    lootModifier: 1.0,
    xpModifier: 1.0,
  },
  {
    id: "guardian",
    name: "Guardian",
    description: "Tank. Safer missions, takes longer.",
    durationModifier: 1.2,
    failRateModifier: -10,
    lootModifier: 1.0,
    xpModifier: 1.0,
  },
  {
    id: "mystic",
    name: "Mystic",
    description: "Gambler. Higher rare loot, riskier, less XP.",
    durationModifier: 1.0,
    failRateModifier: 10,
    lootModifier: 1.3,
    xpModifier: 0.9,
  },
];

export const SKILL_TREES: SkillNode[] = [
  // Scout
  { id: "scout_swift", classId: "scout", name: "Swift Feet", description: "-10% more duration reduction", tier: 1, cost: 1 },
  { id: "scout_escape", classId: "scout", name: "Lucky Escape", description: "50% chance to survive a failed mission (1x/run)", tier: 2, cost: 2 },
  { id: "scout_double", classId: "scout", name: "Double Run", description: "Can send 2 missions simultaneously (1x/day)", tier: 3, cost: 3 },
  // Guardian
  { id: "guardian_iron", classId: "guardian", name: "Iron Will", description: "+1 run life (4 total)", tier: 1, cost: 1 },
  { id: "guardian_shield", classId: "guardian", name: "Resource Shield", description: "Keep 50% resources on death", tier: 2, cost: 2 },
  { id: "guardian_fortify", classId: "guardian", name: "Fortify", description: "-5% fail rate on Tier 3 missions", tier: 3, cost: 3 },
  // Mystic
  { id: "mystic_eye", classId: "mystic", name: "Third Eye", description: "See mission outcome probability", tier: 1, cost: 1 },
  { id: "mystic_ritual", classId: "mystic", name: "Ritual", description: "+15% NFT drop chance on Deep Dive", tier: 2, cost: 2 },
  { id: "mystic_soul", classId: "mystic", name: "Soul Link", description: "On death, collect passive resources for 1h", tier: 3, cost: 3 },
];

export const BOSS_MISSION: MissionType = {
  id: "boss",
  name: "Shadow Boss",
  duration: 43200, // 12h
  failRate: 50,
  rewards: { xpRange: [500, 1000], scrap: [200, 500], crystal: [50, 100], artifact: [2, 5], nftChance: 20 },
};

export const RAIDS: RaidMission[] = [
  { id: "outpost", name: "Outpost Raid", requiredPlayers: 2, duration: 14400, lootMultiplier: 2, description: "2-player raid. 4h. 2x loot." },
  { id: "stronghold", name: "Stronghold Siege", requiredPlayers: 3, duration: 43200, lootMultiplier: 3, description: "3-player raid. 12h. 3x loot + guaranteed Crystal." },
];

export const RUN_LIVES = 3;
export const BOSS_UNLOCK_LEVEL = 5;
export const TIER2_UNLOCK_LEVEL = 3;

export function getClass(id: string): CharacterClass | undefined {
  return CLASSES.find((c) => c.id === id);
}

export function getSkillsForClass(classId: string): SkillNode[] {
  return SKILL_TREES.filter((s) => s.classId === classId);
}

export function getRaid(id: string): RaidMission | undefined {
  return RAIDS.find((r) => r.id === id);
}
```

**Commit:** `feat(api): add class, skill tree, boss, and raid config`

---

### Task 4: Weekly run service

**Files:**
- Create: `apps/api/src/services/run-service.ts`

Service that manages weekly runs: start run (pick class), get active run, end run, calculate week boundaries, track lives/score/skill points.

Key functions:
- `getWeekBounds()` — returns current week Monday 00:00 → Sunday 23:59 UTC
- `getActiveRun(wallet)` — get current week's run if active
- `startRun(wallet, classId)` — create new run for current week
- `endRun(runId)` — mark run as inactive, write to leaderboard
- `addScore(runId, points)` — increment score
- `addSkillPoint(runId)` — earned on mission success
- `useLife(runId)` — decrement lives, end run if 0
- `getLeaderboard(weekStart)` — top 20 by score

**Commit:** `feat(api): add weekly run service`

---

### Task 5: Skill service

**Files:**
- Create: `apps/api/src/services/skill-service.ts`

Service for unlocking and checking skills:
- `unlockSkill(runId, skillId)` — validates cost, prerequisites (tier order), deducts points
- `getUnlockedSkills(runId)` — returns list of unlocked skill IDs
- `hasSkill(runId, skillId)` — boolean check
- `getAvailableSkills(runId, classId)` — returns skills player can unlock

**Commit:** `feat(api): add skill tree service`

---

### Task 6: Modify mission service for class/run awareness

**Files:**
- Modify: `apps/api/src/services/mission-service.ts`

Changes:
- `startMission` now accepts classId and run context — applies class duration modifier
- `claimMission` now applies class fail rate modifier, loot modifier, XP modifier
- On success: `addScore(runId, xp)`, `addSkillPoint(runId)`
- On failure: `useLife(runId)` — if lives = 0, end run
- Check skill effects: "Lucky Escape" can save from death, "Fortify" reduces fail on tier 3, "Ritual" boosts NFT chance
- Boss mission: only available when character level >= 5 and run.bossDefeated = false
- Mission tier gating: expedition requires level >= 3, deep_dive requires level >= 5

**Commit:** `feat(api): make missions class-aware and run-aware`

---

### Task 7: Guild service & routes

**Files:**
- Create: `apps/api/src/services/guild-service.ts`
- Create: `apps/api/src/routes/guilds.ts`
- Modify: `apps/api/src/index.ts`

Guild service:
- `createGuild(wallet, name)` — generates invite code, max 1 guild per wallet as creator
- `joinGuild(wallet, characterId, inviteCode)` — max 5 members
- `leaveGuild(wallet, guildId)`
- `getGuild(guildId)` / `getGuildByMember(wallet)` — with member list
- `getGuildMembers(guildId)`

Routes (all auth-protected):
- `POST /guilds` — create guild `{ name }`
- `POST /guilds/join` — join guild `{ inviteCode }`
- `POST /guilds/leave` — leave current guild
- `GET /guilds/mine` — get player's guild with members

Mount in index.ts.

**Commit:** `feat(api): add guild CRUD service and routes`

---

### Task 8: Raid service & routes

**Files:**
- Create: `apps/api/src/services/raid-service.ts`
- Create: `apps/api/src/routes/raids.ts`
- Modify: `apps/api/src/index.ts`

Raid service:
- `getAvailableRaids(guildId)` — raids the guild can start (check member count)
- `startRaid(guildId, raidId, wallet, characterId)` — first player commits
- `commitToRaid(activeRaidId, wallet, characterId)` — additional players commit
- `getActiveRaid(guildId)` — current raid if any
- `claimRaid(activeRaidId, wallet)` — after timer, claim rewards (loot × multiplier for each participant)

Routes:
- `GET /raids` — available raids for player's guild
- `GET /raids/active` — current active raid
- `POST /raids/start` — start a raid `{ raidId }`
- `POST /raids/commit` — commit to active raid
- `POST /raids/claim` — claim raid rewards

Mount in index.ts.

**Commit:** `feat(api): add raid service and routes`

---

### Task 9: Run & leaderboard routes

**Files:**
- Create: `apps/api/src/routes/runs.ts`
- Modify: `apps/api/src/index.ts`

Routes:
- `GET /runs/current` — get active run (or null)
- `POST /runs/start` — start new run `{ classId }`
- `GET /runs/leaderboard` — current week top 20
- `GET /runs/classes` — list available classes

Mount in index.ts.

**Commit:** `feat(api): add run management and leaderboard routes`

---

### Task 10: Skill routes

**Files:**
- Create: `apps/api/src/routes/skills.ts`
- Modify: `apps/api/src/index.ts`

Routes:
- `GET /skills` — get skill tree for current class + which are unlocked
- `POST /skills/unlock` — unlock a skill `{ skillId }`

Mount in index.ts.

**Commit:** `feat(api): add skill tree routes`

---

## Phase 3: Frontend

### Task 11: Class picker screen

**Files:**
- Create: `apps/web/src/features/game/ClassPicker.tsx`
- Modify: `apps/web/src/hooks/useGameState.ts`
- Modify: `apps/web/src/features/game/GameDashboard.tsx`

A full-screen class selection with 3 cards (Scout/Guardian/Mystic), each showing stats and description. Appears when player has no active run. After picking a class, starts the weekly run.

Update useGameState to fetch `/runs/current` and `/runs/classes`. If no active run, show ClassPicker instead of GameDashboard content.

**Commit:** `feat(web): add class picker for weekly runs`

---

### Task 12: Run status & skill tree UI

**Files:**
- Create: `apps/web/src/features/game/RunStatus.tsx`
- Create: `apps/web/src/features/game/SkillTree.tsx`
- Modify: `apps/web/src/features/game/GameDashboard.tsx`

RunStatus card: shows current week, lives remaining (heart icons), score, skill points available, class badge, and boss availability.

SkillTree panel: 3 nodes in a vertical chain, shows locked/unlocked/affordable state. Unlock button per node.

Wire both into GameDashboard above the mission panel.

**Commit:** `feat(web): add run status display and skill tree UI`

---

### Task 13: Guild panel

**Files:**
- Create: `apps/web/src/features/guild/GuildPanel.tsx`
- Create: `apps/web/src/features/guild/CreateGuildDialog.tsx`
- Create: `apps/web/src/features/guild/JoinGuildDialog.tsx`
- Modify: `apps/web/src/features/game/GameDashboard.tsx`

GuildPanel: shows guild name, members, invite code (copy button), leave button. If not in a guild, shows Create/Join buttons.

CreateGuildDialog: input for guild name, creates via API.

JoinGuildDialog: input for invite code, joins via API.

Add GuildPanel to GameDashboard below upgrades.

**Commit:** `feat(web): add guild panel with create and join`

---

### Task 14: Raid panel

**Files:**
- Create: `apps/web/src/features/guild/RaidPanel.tsx`
- Modify: `apps/web/src/features/game/GameDashboard.tsx`

Shows available raids for the guild. If a raid is active, shows timer + committed players + commit button. If raid timer complete, shows claim button.

Add to GameDashboard after GuildPanel (only visible if player is in a guild).

**Commit:** `feat(web): add raid panel with commit and claim`

---

### Task 15: Leaderboard panel

**Files:**
- Create: `apps/web/src/features/game/LeaderboardPanel.tsx`
- Modify: `apps/web/src/features/game/GameDashboard.tsx`

Shows top 20 players for current week with rank, wallet (truncated), class icon, score. Highlights current player's position.

Add as collapsible/expandable section at bottom of GameDashboard.

**Commit:** `feat(web): add weekly leaderboard panel`

---

### Task 16: Update CharacterCard & MissionPanel for classes

**Files:**
- Modify: `apps/web/src/features/game/CharacterCard.tsx`
- Modify: `apps/web/src/features/game/MissionPanel.tsx`

CharacterCard: add class icon/name, show run lives as hearts.

MissionPanel: show tier locks (expedition locked below level 3, deep dive below 5), show boss mission when available, apply class duration modifier to displayed times.

**Commit:** `feat(web): update character and mission UI for classes and tiers`

---

### Task 17: Integration test & dev shortcuts

**Files:**
- Modify: `apps/api/src/index.ts` (dev routes)

Add dev routes:
- `POST /dev/advance-week` — end current week, simulate week transition
- `POST /dev/add-resources` — give player resources for testing upgrades
- `POST /dev/add-skill-points` — give skill points for testing tree

Full end-to-end API test of the complete roguelike loop.

**Commit:** `feat: add dev shortcuts, complete roguelike integration test`

---

## Summary

| Phase | Tasks | What |
|-------|-------|------|
| Phase 1 | Tasks 1-2 | Types + DB schema |
| Phase 2 | Tasks 3-10 | Backend services & routes (classes, runs, skills, guilds, raids, leaderboard) |
| Phase 3 | Tasks 11-17 | Frontend UI (class picker, skill tree, guild, raids, leaderboard, polish) |

**Total: 17 tasks across 3 phases.**
