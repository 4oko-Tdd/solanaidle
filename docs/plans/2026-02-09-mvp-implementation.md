# MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete MVP game loop — wallet sign-in, character creation, missions (start/wait/claim), inventory, gear upgrades — with a polished mobile-first UI.

**Architecture:** Backend-first approach. Build DB schema + all API routes with tests first, then wire up the frontend. Game state is 100% server-authoritative. Frontend is a thin client that polls/fetches state and renders it.

**Tech Stack:** Hono + better-sqlite3 + JWT (API), React + Vite + Tailwind + shadcn/ui + ConnectorKit (Web), shared TypeScript types.

---

## Phase 1: Backend Foundation

### Task 1: Database Schema & Connection

**Files:**
- Create: `apps/api/src/db/database.ts`
- Create: `apps/api/src/db/schema.ts`

**Step 1: Create DB connection module**

```typescript
// apps/api/src/db/database.ts
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.resolve(import.meta.dirname, "../../data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "game.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export default db;
```

**Step 2: Create schema initialization**

```typescript
// apps/api/src/db/schema.ts
import db from "./database.js";

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      wallet_address TEXT UNIQUE NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0,
      hp INTEGER NOT NULL DEFAULT 100,
      gear_level INTEGER NOT NULL DEFAULT 1,
      state TEXT NOT NULL DEFAULT 'idle' CHECK(state IN ('idle', 'on_mission', 'dead')),
      revive_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS active_missions (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL REFERENCES characters(id),
      mission_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      UNIQUE(character_id)
    );

    CREATE TABLE IF NOT EXISTS inventories (
      character_id TEXT PRIMARY KEY REFERENCES characters(id),
      scrap INTEGER NOT NULL DEFAULT 0,
      crystal INTEGER NOT NULL DEFAULT 0,
      artifact INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS nft_claims (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL REFERENCES characters(id),
      mission_id TEXT NOT NULL,
      nft_name TEXT NOT NULL,
      claimed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS nonces (
      nonce TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
```

**Step 3: Wire schema init into server startup**

In `apps/api/src/index.ts`, add before `serve()`:
```typescript
import { initSchema } from "./db/schema.js";
initSchema();
```

**Step 4: Verify server starts with DB**

Run: `pnpm --filter api dev`
Expected: Server starts, `apps/api/data/game.db` file is created.

**Step 5: Commit**

```bash
git add apps/api/src/db/ apps/api/src/index.ts
git commit -m "feat(api): add SQLite schema and database connection"
```

---

### Task 2: Auth Routes (nonce + verify)

**Files:**
- Create: `apps/api/src/routes/auth.ts`
- Create: `apps/api/src/services/auth-service.ts`
- Modify: `apps/api/src/index.ts` (mount route)

**Step 1: Create auth service**

```typescript
// apps/api/src/services/auth-service.ts
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import nacl from "tweetnacl";
import bs58 from "bs58";
import db from "../db/database.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-prod";
const NONCE_EXPIRY_MINUTES = 5;

export function createNonce(): string {
  const random = randomBytes(32).toString("hex");
  const nonce = `Sign this message to verify your wallet: ${random}`;
  db.prepare("INSERT INTO nonces (nonce) VALUES (?)").run(nonce);
  return nonce;
}

export function verifySignature(publicKey: string, signature: string, nonce: string): boolean {
  // Check nonce exists and isn't expired
  const row = db.prepare(
    "SELECT * FROM nonces WHERE nonce = ? AND datetime(created_at, '+' || ? || ' minutes') > datetime('now')"
  ).get(nonce, NONCE_EXPIRY_MINUTES) as { nonce: string } | undefined;

  if (!row) return false;

  // Delete used nonce
  db.prepare("DELETE FROM nonces WHERE nonce = ?").run(nonce);

  // Verify Ed25519 signature
  try {
    const messageBytes = new TextEncoder().encode(nonce);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(publicKey);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

export function createToken(walletAddress: string): string {
  return jwt.sign({ wallet: walletAddress }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { wallet: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { wallet: string };
  } catch {
    return null;
  }
}
```

**Step 2: Create auth routes**

```typescript
// apps/api/src/routes/auth.ts
import { Hono } from "hono";
import { createNonce, verifySignature, createToken } from "../services/auth-service.js";

const auth = new Hono();

auth.get("/nonce", (c) => {
  const nonce = createNonce();
  return c.json({ nonce });
});

auth.post("/verify", async (c) => {
  const { publicKey, signature, nonce } = await c.req.json();

  if (!publicKey || !signature || !nonce) {
    return c.json({ error: "UNAUTHORIZED", message: "Missing required fields" }, 400);
  }

  const valid = verifySignature(publicKey, signature, nonce);
  if (!valid) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid signature" }, 401);
  }

  const token = createToken(publicKey);
  return c.json({ token });
});

export default auth;
```

**Step 3: Create auth middleware**

```typescript
// apps/api/src/middleware/auth.ts
import { Context, Next } from "hono";
import { verifyToken } from "../services/auth-service.js";

export async function authMiddleware(c: Context, next: Next) {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "UNAUTHORIZED", message: "Missing or invalid token" }, 401);
  }

  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid or expired token" }, 401);
  }

  c.set("wallet", payload.wallet);
  await next();
}
```

**Step 4: Mount auth route in index.ts**

Add to `apps/api/src/index.ts`:
```typescript
import auth from "./routes/auth.js";
app.route("/auth", auth);
```

**Step 5: Test with curl**

```bash
curl http://localhost:3000/api/auth/nonce
```
Expected: `{"nonce":"Sign this message to verify your wallet: ..."}`

**Step 6: Commit**

```bash
git add apps/api/src/routes/auth.ts apps/api/src/services/auth-service.ts apps/api/src/middleware/ apps/api/src/index.ts
git commit -m "feat(api): add wallet auth with nonce challenge and JWT"
```

---

### Task 3: Character Routes

**Files:**
- Create: `apps/api/src/routes/character.ts`
- Create: `apps/api/src/services/character-service.ts`
- Modify: `apps/api/src/index.ts`

**Step 1: Create character service**

```typescript
// apps/api/src/services/character-service.ts
import { randomUUID } from "crypto";
import db from "../db/database.js";
import type { Character } from "@solanaidle/shared";

interface CharacterRow {
  id: string;
  wallet_address: string;
  level: number;
  xp: number;
  hp: number;
  gear_level: number;
  state: string;
  revive_at: string | null;
}

function rowToCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    level: row.level,
    xp: row.xp,
    hp: row.hp,
    gearLevel: row.gear_level,
    state: row.state as Character["state"],
    reviveAt: row.revive_at,
  };
}

export function getCharacter(wallet: string): Character | null {
  const row = db.prepare("SELECT * FROM characters WHERE wallet_address = ?").get(wallet) as CharacterRow | undefined;
  if (!row) return null;

  // Auto-revive if cooldown passed
  if (row.state === "dead" && row.revive_at && new Date(row.revive_at) <= new Date()) {
    db.prepare("UPDATE characters SET state = 'idle', revive_at = NULL WHERE id = ?").run(row.id);
    row.state = "idle";
    row.revive_at = null;
  }

  return rowToCharacter(row);
}

export function createCharacter(wallet: string): Character {
  const id = randomUUID();
  db.prepare(
    "INSERT INTO characters (id, wallet_address) VALUES (?, ?)"
  ).run(id, wallet);
  db.prepare(
    "INSERT INTO inventories (character_id) VALUES (?)"
  ).run(id);
  return getCharacter(wallet)!;
}
```

**Step 2: Create character routes**

```typescript
// apps/api/src/routes/character.ts
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter, createCharacter } from "../services/character-service.js";

const character = new Hono();
character.use("*", authMiddleware);

character.get("/", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);
  }
  return c.json(char);
});

character.post("/", (c) => {
  const wallet = c.get("wallet");
  const existing = getCharacter(wallet);
  if (existing) {
    return c.json({ error: "CHARACTER_EXISTS", message: "Character already exists" }, 409);
  }
  const char = createCharacter(wallet);
  return c.json(char, 201);
});

export default character;
```

**Step 3: Mount in index.ts**

```typescript
import character from "./routes/character.js";
app.route("/character", character);
```

**Step 4: Commit**

```bash
git add apps/api/src/routes/character.ts apps/api/src/services/character-service.ts apps/api/src/index.ts
git commit -m "feat(api): add character creation and retrieval"
```

---

### Task 4: Mission Routes (start, active, claim)

**Files:**
- Create: `apps/api/src/routes/missions.ts`
- Create: `apps/api/src/services/mission-service.ts`
- Create: `apps/api/src/services/game-config.ts`
- Modify: `apps/api/src/index.ts`

**Step 1: Create game config (mission definitions, upgrade costs)**

```typescript
// apps/api/src/services/game-config.ts
import type { MissionType, UpgradeCost } from "@solanaidle/shared";

export const MISSIONS: MissionType[] = [
  {
    id: "scout",
    name: "Scout",
    duration: 3600,
    failRate: 10,
    rewards: { xpRange: [10, 25], scrap: [5, 15] },
  },
  {
    id: "expedition",
    name: "Expedition",
    duration: 21600,
    failRate: 25,
    rewards: { xpRange: [50, 120], scrap: [20, 50], crystal: [3, 10] },
  },
  {
    id: "deep_dive",
    name: "Deep Dive",
    duration: 86400,
    failRate: 40,
    rewards: { xpRange: [150, 400], scrap: [50, 150], crystal: [10, 30], artifact: [0, 2], nftChance: 5 },
  },
];

export const GEAR_UPGRADES: { level: number; cost: UpgradeCost; failRateReduction: number }[] = [
  { level: 1, cost: { scrap: 10 }, failRateReduction: 0 },
  { level: 2, cost: { scrap: 25, crystal: 5 }, failRateReduction: 2 },
  { level: 3, cost: { scrap: 50, crystal: 15 }, failRateReduction: 5 },
  { level: 4, cost: { scrap: 100, crystal: 30, artifact: 1 }, failRateReduction: 8 },
  { level: 5, cost: { scrap: 200, crystal: 60, artifact: 3 }, failRateReduction: 12 },
];

export const MAX_GEAR_LEVEL = 5;
export const REVIVE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
export const XP_PER_LEVEL = 100; // XP needed = level * XP_PER_LEVEL

export const NFT_NAMES = [
  "Shadow Explorer Badge",
  "Abyssal Wanderer Mark",
  "Deep Void Sigil",
  "Phantom Diver Token",
  "Obsidian Pathfinder Crest",
];

export function getMission(id: string): MissionType | undefined {
  return MISSIONS.find((m) => m.id === id);
}

export function getGearUpgrade(level: number) {
  return GEAR_UPGRADES.find((u) => u.level === level);
}

export function getFailRateReduction(gearLevel: number): number {
  const upgrade = GEAR_UPGRADES.find((u) => u.level === gearLevel);
  return upgrade?.failRateReduction ?? 0;
}
```

**Step 2: Create mission service**

```typescript
// apps/api/src/services/mission-service.ts
import { randomUUID } from "crypto";
import db from "../db/database.js";
import { getMission, getFailRateReduction, REVIVE_COOLDOWN_MS, XP_PER_LEVEL, NFT_NAMES } from "./game-config.js";
import type { ActiveMission, MissionClaimResponse, MissionId } from "@solanaidle/shared";

interface MissionRow {
  id: string;
  character_id: string;
  mission_id: string;
  started_at: string;
  ends_at: string;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getActiveMission(characterId: string): ActiveMission | null {
  const row = db.prepare("SELECT * FROM active_missions WHERE character_id = ?").get(characterId) as MissionRow | undefined;
  if (!row) return null;

  const now = Date.now();
  const endsAt = new Date(row.ends_at).getTime();
  const timeRemaining = Math.max(0, Math.floor((endsAt - now) / 1000));

  return {
    missionId: row.mission_id as MissionId,
    startedAt: row.started_at,
    endsAt: row.ends_at,
    timeRemaining,
  };
}

export function startMission(characterId: string, missionId: string): ActiveMission {
  const mission = getMission(missionId);
  if (!mission) throw new Error("Invalid mission");

  const now = new Date();
  const endsAt = new Date(now.getTime() + mission.duration * 1000);

  const id = randomUUID();
  db.prepare(
    "INSERT INTO active_missions (id, character_id, mission_id, started_at, ends_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, characterId, missionId, now.toISOString(), endsAt.toISOString());

  db.prepare("UPDATE characters SET state = 'on_mission' WHERE id = ?").run(characterId);

  return {
    missionId: mission.id,
    startedAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

export function claimMission(characterId: string, gearLevel: number): MissionClaimResponse {
  const missionRow = db.prepare("SELECT * FROM active_missions WHERE character_id = ?").get(characterId) as MissionRow | undefined;
  if (!missionRow) throw new Error("No active mission");

  const endsAt = new Date(missionRow.ends_at).getTime();
  if (Date.now() < endsAt) throw new Error("Mission not complete");

  const mission = getMission(missionRow.mission_id)!;

  // Delete active mission
  db.prepare("DELETE FROM active_missions WHERE id = ?").run(missionRow.id);

  // Roll for success
  const failReduction = getFailRateReduction(gearLevel);
  const adjustedFailRate = Math.max(0, mission.failRate - failReduction);
  const roll = Math.random() * 100;

  if (roll < adjustedFailRate) {
    // FAILURE
    const reviveAt = new Date(Date.now() + REVIVE_COOLDOWN_MS).toISOString();
    db.prepare("UPDATE characters SET state = 'dead', revive_at = ? WHERE id = ?").run(reviveAt, characterId);

    const char = db.prepare("SELECT * FROM characters WHERE id = ?").get(characterId) as any;
    return {
      result: "failure",
      rewards: null,
      nftDrop: null,
      character: {
        id: char.id,
        walletAddress: char.wallet_address,
        level: char.level,
        xp: char.xp,
        hp: char.hp,
        gearLevel: char.gear_level,
        state: "dead",
        reviveAt: reviveAt,
      },
    };
  }

  // SUCCESS — calculate rewards
  const rewards = {
    xp: randomInt(mission.rewards.xpRange[0], mission.rewards.xpRange[1]),
    scrap: randomInt(mission.rewards.scrap[0], mission.rewards.scrap[1]),
    crystal: mission.rewards.crystal ? randomInt(mission.rewards.crystal[0], mission.rewards.crystal[1]) : undefined,
    artifact: mission.rewards.artifact ? randomInt(mission.rewards.artifact[0], mission.rewards.artifact[1]) : undefined,
  };

  // Apply XP and check level up
  const charRow = db.prepare("SELECT * FROM characters WHERE id = ?").get(characterId) as any;
  let newXp = charRow.xp + rewards.xp;
  let newLevel = charRow.level;
  while (newXp >= newLevel * XP_PER_LEVEL) {
    newXp -= newLevel * XP_PER_LEVEL;
    newLevel++;
  }

  db.prepare("UPDATE characters SET state = 'idle', level = ?, xp = ?, revive_at = NULL WHERE id = ?")
    .run(newLevel, newXp, characterId);

  // Add resources to inventory
  const updateInv = db.prepare(
    "UPDATE inventories SET scrap = scrap + ?, crystal = crystal + ?, artifact = artifact + ? WHERE character_id = ?"
  );
  updateInv.run(rewards.scrap, rewards.crystal ?? 0, rewards.artifact ?? 0, characterId);

  // Check NFT drop
  let nftDrop = null;
  if (mission.rewards.nftChance && Math.random() * 100 < mission.rewards.nftChance) {
    const nftId = randomUUID();
    const nftName = NFT_NAMES[randomInt(0, NFT_NAMES.length - 1)];
    db.prepare("INSERT INTO nft_claims (id, character_id, mission_id, nft_name) VALUES (?, ?, ?, ?)")
      .run(nftId, characterId, mission.id, nftName);
    nftDrop = { id: nftId, missionId: mission.id as MissionId, nftName, claimedAt: null };
  }

  const updatedChar = db.prepare("SELECT * FROM characters WHERE id = ?").get(characterId) as any;
  return {
    result: "success",
    rewards,
    nftDrop,
    character: {
      id: updatedChar.id,
      walletAddress: updatedChar.wallet_address,
      level: updatedChar.level,
      xp: updatedChar.xp,
      hp: updatedChar.hp,
      gearLevel: updatedChar.gear_level,
      state: "idle",
      reviveAt: null,
    },
  };
}
```

**Step 3: Create mission routes**

```typescript
// apps/api/src/routes/missions.ts
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
import { getActiveMission, startMission, claimMission } from "../services/mission-service.js";
import { MISSIONS } from "../services/game-config.js";

const missions = new Hono();
missions.use("*", authMiddleware);

missions.get("/", (c) => {
  return c.json(MISSIONS);
});

missions.get("/active", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);

  const active = getActiveMission(char.id);
  return c.json({ activeMission: active });
});

missions.post("/start", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);
  if (char.state === "on_mission") return c.json({ error: "MISSION_IN_PROGRESS", message: "Already on a mission" }, 409);
  if (char.state === "dead") return c.json({ error: "CHARACTER_DEAD", message: "Character is dead" }, 409);

  const { missionId } = await c.req.json();
  if (!["scout", "expedition", "deep_dive"].includes(missionId)) {
    return c.json({ error: "MISSION_IN_PROGRESS", message: "Invalid mission type" }, 400);
  }

  const activeMission = startMission(char.id, missionId);
  return c.json({ activeMission });
});

missions.post("/claim", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);
  if (char.state !== "on_mission") return c.json({ error: "MISSION_NOT_COMPLETE", message: "No active mission" }, 400);

  const active = getActiveMission(char.id);
  if (active && active.timeRemaining && active.timeRemaining > 0) {
    return c.json({ error: "MISSION_NOT_COMPLETE", message: "Mission still in progress" }, 400);
  }

  const result = claimMission(char.id, char.gearLevel);
  return c.json(result);
});

export default missions;
```

**Step 4: Mount in index.ts**

```typescript
import missions from "./routes/missions.js";
app.route("/missions", missions);
```

**Step 5: Commit**

```bash
git add apps/api/src/services/game-config.ts apps/api/src/services/mission-service.ts apps/api/src/routes/missions.ts apps/api/src/index.ts
git commit -m "feat(api): add mission start, active, and claim routes"
```

---

### Task 5: Inventory & Upgrade Routes

**Files:**
- Create: `apps/api/src/routes/inventory.ts`
- Create: `apps/api/src/routes/upgrades.ts`
- Create: `apps/api/src/services/upgrade-service.ts`
- Modify: `apps/api/src/index.ts`

**Step 1: Create inventory route**

```typescript
// apps/api/src/routes/inventory.ts
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
import db from "../db/database.js";
import type { Inventory } from "@solanaidle/shared";

const inventory = new Hono();
inventory.use("*", authMiddleware);

inventory.get("/", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);

  const inv = db.prepare("SELECT scrap, crystal, artifact FROM inventories WHERE character_id = ?")
    .get(char.id) as Inventory;
  return c.json(inv);
});

export default inventory;
```

**Step 2: Create upgrade service**

```typescript
// apps/api/src/services/upgrade-service.ts
import db from "../db/database.js";
import { getGearUpgrade, MAX_GEAR_LEVEL } from "./game-config.js";
import type { Inventory, UpgradeInfo } from "@solanaidle/shared";

export function getUpgradeInfo(characterId: string, gearLevel: number): UpgradeInfo {
  if (gearLevel >= MAX_GEAR_LEVEL) {
    return { currentGearLevel: gearLevel, nextUpgrade: null };
  }

  const next = getGearUpgrade(gearLevel + 1)!;
  const inv = db.prepare("SELECT scrap, crystal, artifact FROM inventories WHERE character_id = ?")
    .get(characterId) as Inventory;

  const canAfford =
    inv.scrap >= next.cost.scrap &&
    inv.crystal >= (next.cost.crystal ?? 0) &&
    inv.artifact >= (next.cost.artifact ?? 0);

  return {
    currentGearLevel: gearLevel,
    nextUpgrade: {
      level: next.level,
      cost: next.cost,
      failRateReduction: next.failRateReduction,
      canAfford,
    },
  };
}

export function upgradeGear(characterId: string, gearLevel: number): { gearLevel: number; inventory: Inventory } {
  const info = getUpgradeInfo(characterId, gearLevel);
  if (!info.nextUpgrade) throw new Error("MAX_GEAR_LEVEL");
  if (!info.nextUpgrade.canAfford) throw new Error("INSUFFICIENT_RESOURCES");

  const cost = info.nextUpgrade.cost;

  db.prepare(
    "UPDATE inventories SET scrap = scrap - ?, crystal = crystal - ?, artifact = artifact - ? WHERE character_id = ?"
  ).run(cost.scrap, cost.crystal ?? 0, cost.artifact ?? 0, characterId);

  db.prepare("UPDATE characters SET gear_level = ? WHERE id = ?").run(info.nextUpgrade.level, characterId);

  const inv = db.prepare("SELECT scrap, crystal, artifact FROM inventories WHERE character_id = ?")
    .get(characterId) as Inventory;

  return { gearLevel: info.nextUpgrade.level, inventory: inv };
}
```

**Step 3: Create upgrade routes**

```typescript
// apps/api/src/routes/upgrades.ts
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
import { getUpgradeInfo, upgradeGear } from "../services/upgrade-service.js";

const upgrades = new Hono();
upgrades.use("*", authMiddleware);

upgrades.get("/", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);

  const info = getUpgradeInfo(char.id, char.gearLevel);
  return c.json(info);
});

upgrades.post("/gear", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);

  try {
    const result = upgradeGear(char.id, char.gearLevel);
    return c.json(result);
  } catch (e: any) {
    if (e.message === "MAX_GEAR_LEVEL") {
      return c.json({ error: "MAX_GEAR_LEVEL", message: "Already at maximum gear level" }, 400);
    }
    if (e.message === "INSUFFICIENT_RESOURCES") {
      return c.json({ error: "INSUFFICIENT_RESOURCES", message: "Not enough resources" }, 400);
    }
    throw e;
  }
});

export default upgrades;
```

**Step 4: Mount both routes in index.ts**

```typescript
import inventory from "./routes/inventory.js";
import upgrades from "./routes/upgrades.js";
app.route("/inventory", inventory);
app.route("/upgrades", upgrades);
```

**Step 5: Commit**

```bash
git add apps/api/src/routes/inventory.ts apps/api/src/routes/upgrades.ts apps/api/src/services/upgrade-service.ts apps/api/src/index.ts
git commit -m "feat(api): add inventory and gear upgrade routes"
```

---

### Task 6: NFT Claims Route

**Files:**
- Create: `apps/api/src/routes/claims.ts`
- Modify: `apps/api/src/index.ts`

**Step 1: Create claims routes**

```typescript
// apps/api/src/routes/claims.ts
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
import db from "../db/database.js";

const claims = new Hono();
claims.use("*", authMiddleware);

claims.get("/", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);

  const rows = db.prepare(
    "SELECT id, mission_id as missionId, nft_name as nftName, claimed_at as claimedAt FROM nft_claims WHERE character_id = ?"
  ).all(char.id);
  return c.json(rows);
});

claims.post("/:id/mint", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);

  const claimId = c.req.param("id");
  const claim = db.prepare("SELECT * FROM nft_claims WHERE id = ? AND character_id = ?").get(claimId, char.id) as any;

  if (!claim) return c.json({ error: "CLAIM_NOT_FOUND", message: "Claim not found" }, 404);
  if (claim.claimed_at) return c.json({ error: "ALREADY_CLAIMED", message: "Already claimed" }, 409);

  // In MVP, just mark as claimed (actual Solana mint is future work)
  db.prepare("UPDATE nft_claims SET claimed_at = datetime('now') WHERE id = ?").run(claimId);

  return c.json({
    transaction: null,
    message: `Claimed: ${claim.nft_name} (on-chain minting coming soon)`,
  });
});

export default claims;
```

**Step 2: Mount in index.ts**

```typescript
import claims from "./routes/claims.js";
app.route("/claims", claims);
```

**Step 3: Commit**

```bash
git add apps/api/src/routes/claims.ts apps/api/src/index.ts
git commit -m "feat(api): add NFT claims routes (MVP placeholder mint)"
```

---

## Phase 2: Frontend — shadcn/ui Setup & Wallet Integration

### Task 7: Initialize shadcn/ui

**Step 1: Install shadcn/ui CLI and init**

```bash
cd apps/web
pnpm add tailwindcss-animate class-variance-authority clsx tailwind-merge lucide-react
```

Create `apps/web/src/lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 2: Add shadcn components needed**

Run `npx shadcn@latest init` in `apps/web/`, then add:
```bash
npx shadcn@latest add button card progress badge dialog
```

**Step 3: Commit**

```bash
git add apps/web/
git commit -m "feat(web): initialize shadcn/ui with core components"
```

---

### Task 8: Wallet Provider & Connect Button

**Files:**
- Create: `apps/web/src/providers/WalletProvider.tsx`
- Create: `apps/web/src/features/wallet/ConnectButton.tsx`
- Create: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/App.tsx`

**Step 1: Create wallet provider**

```typescript
// apps/web/src/providers/WalletProvider.tsx
import { useMemo } from "react";
import { AppProvider } from "@solana/connector/react";
import { getDefaultConfig, getDefaultMobileConfig } from "@solana/connector/headless";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const connectorConfig = useMemo(() => {
    return getDefaultConfig({
      appName: "Solana Idle",
      appUrl: window.location.origin,
      autoConnect: true,
      enableMobile: true,
    });
  }, []);

  const mobile = useMemo(
    () => getDefaultMobileConfig({
      appName: "Solana Idle",
      appUrl: window.location.origin,
    }),
    []
  );

  return (
    <AppProvider connectorConfig={connectorConfig} mobile={mobile}>
      {children}
    </AppProvider>
  );
}
```

**Step 2: Create API client**

```typescript
// apps/web/src/lib/api.ts
let authToken: string | null = localStorage.getItem("auth_token");

export function setAuthToken(token: string) {
  authToken = token;
  localStorage.setItem("auth_token", token);
}

export function clearAuthToken() {
  authToken = null;
  localStorage.removeItem("auth_token");
}

export function getAuthToken() {
  return authToken;
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const res = await fetch(`/api${path}`, { ...options, headers: { ...headers, ...options?.headers } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "UNKNOWN", message: res.statusText }));
    throw err;
  }
  return res.json();
}
```

**Step 3: Create connect button**

```typescript
// apps/web/src/features/wallet/ConnectButton.tsx
import { useConnector, useAccount } from "@solana/connector";
import { Button } from "@/components/ui/button";
import { api, setAuthToken, clearAuthToken } from "@/lib/api";
import type { AuthNonceResponse, AuthVerifyResponse } from "@solanaidle/shared";

export function ConnectButton() {
  const { wallets, select, disconnect, connected, connecting } = useConnector();
  const { address, formatted } = useAccount();

  async function handleConnect(walletName: string) {
    await select(walletName);
  }

  async function handleAuth() {
    if (!address) return;
    try {
      // 1. Get nonce
      const { nonce } = await api<AuthNonceResponse>("/auth/nonce");

      // 2. Sign message (ConnectorKit handles this)
      const { wallets } = useConnector.getState?.() ?? {};
      // Signing will be done via wallet adapter - simplified for MVP
      // The actual signing flow will be implemented when wiring up the full auth

      // 3. Verify and get token
      // const { token } = await api<AuthVerifyResponse>("/auth/verify", { ... });
      // setAuthToken(token);
    } catch (err) {
      console.error("Auth failed:", err);
    }
  }

  if (connecting) {
    return <Button disabled variant="outline">Connecting...</Button>;
  }

  if (connected && formatted) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="font-mono text-xs">
          {formatted}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { clearAuthToken(); disconnect(); }}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {wallets.map((w) => (
        <Button key={w.wallet.name} onClick={() => handleConnect(w.wallet.name)}>
          Connect {w.wallet.name}
        </Button>
      ))}
      {wallets.length === 0 && (
        <Button disabled variant="outline">No wallets found</Button>
      )}
    </div>
  );
}
```

**Step 4: Wire up App.tsx and main.tsx**

Update `main.tsx` to wrap with WalletProvider. Update `App.tsx` to show ConnectButton and game UI stub.

**Step 5: Commit**

```bash
git add apps/web/src/
git commit -m "feat(web): add wallet provider, connect button, and API client"
```

---

### Task 9: Game Dashboard UI

**Files:**
- Create: `apps/web/src/features/game/GameDashboard.tsx`
- Create: `apps/web/src/features/game/CharacterCard.tsx`
- Create: `apps/web/src/features/game/MissionPanel.tsx`
- Create: `apps/web/src/features/game/MissionTimer.tsx`
- Create: `apps/web/src/features/inventory/InventoryPanel.tsx`
- Create: `apps/web/src/features/game/UpgradePanel.tsx`
- Create: `apps/web/src/hooks/useGameState.ts`
- Modify: `apps/web/src/App.tsx`

**Step 1: Create useGameState hook**

A single hook that fetches character, active mission, inventory, and upgrades from the API and exposes actions (startMission, claimMission, upgradeGear).

**Step 2: Create CharacterCard**

Shows level, XP bar, gear level, character state (idle/on_mission/dead with revive countdown).

**Step 3: Create MissionPanel**

Shows 3 mission cards with duration, risk, reward info. Disabled when character is not idle.

**Step 4: Create MissionTimer**

Real-time countdown timer for active mission. Shows claim button when complete.

**Step 5: Create InventoryPanel**

Shows scrap, crystal, artifact counts.

**Step 6: Create UpgradePanel**

Shows current gear level, next upgrade cost, upgrade button.

**Step 7: Create GameDashboard**

Composes all panels into a single mobile-first layout.

**Step 8: Commit**

```bash
git add apps/web/src/
git commit -m "feat(web): add game dashboard with character, missions, inventory, upgrades"
```

---

### Task 10: Auth Flow Integration

**Files:**
- Modify: `apps/web/src/features/wallet/ConnectButton.tsx`
- Create: `apps/web/src/hooks/useAuth.ts`
- Modify: `apps/web/src/App.tsx`

**Step 1: Create useAuth hook**

Handles full auth flow: get nonce → signMessage via ConnectorKit → verify → store JWT. Auto-creates character if needed.

**Step 2: Update ConnectButton**

After wallet connects, auto-trigger auth flow. Show loading state during auth.

**Step 3: Update App.tsx**

Show landing/connect screen when not authenticated, GameDashboard when authenticated.

**Step 4: Test full flow**

- Connect wallet
- Sign nonce message
- Get JWT
- Auto-create character
- See game dashboard

**Step 5: Commit**

```bash
git add apps/web/src/
git commit -m "feat(web): complete wallet auth flow with auto character creation"
```

---

### Task 11: Polish & Mobile UX

**Files:**
- Various UI components
- `apps/web/src/App.tsx`

**Step 1: Add loading states and error handling**

Skeleton loaders, error toasts, retry buttons.

**Step 2: Mobile-first layout pass**

- Full-width cards on mobile
- Bottom action bar
- Touch-friendly tap targets (min 44px)
- Safe area insets for PWA

**Step 3: Add mission result dialog**

After claiming a mission, show a dramatic reveal dialog (success/fail, loot gained, NFT drop).

**Step 4: Add dark theme polish**

Consistent color palette, subtle gradients, glow effects on important actions.

**Step 5: Commit**

```bash
git add apps/web/
git commit -m "feat(web): polish mobile UX, loading states, mission result dialog"
```

---

### Task 12: Final Integration & Test

**Step 1: End-to-end manual test**

1. Start both servers (`pnpm dev`)
2. Open `http://localhost:5173`
3. Connect wallet → auto-auth → character created
4. Start scout mission (1h timer — use short timer for testing)
5. Wait / skip (add dev shortcut)
6. Claim → see success/fail
7. Check inventory updated
8. Try upgrade

**Step 2: Add dev shortcuts**

In API, add `GET /dev/skip-timer` that sets active mission end time to now (only in dev mode).

**Step 3: Final commit and push**

```bash
git add .
git commit -m "feat: complete MVP game loop — wallet auth, missions, inventory, upgrades"
git push
```

---

## Summary

| Phase | Tasks | What |
|-------|-------|------|
| Phase 1 | Tasks 1–6 | Full backend API (DB, auth, character, missions, inventory, upgrades, claims) |
| Phase 2 | Tasks 7–12 | Frontend (shadcn, wallet, game UI, auth flow, polish) |

**Total: 12 tasks, backend-first approach.**
