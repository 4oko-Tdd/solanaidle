# Jupiter "Network Intel" Quest System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a daily/weekly quest system powered by Jupiter APIs that rewards players with in-game boosts for interacting with Solana DeFi data (price checks, token scans, portfolio reviews, micro-swaps, prediction markets).

**Architecture:** Server-side quest tracking with Jupiter API proxy. Free quests use read-only Jupiter APIs (Price V3, Token V2, Portfolio). Paid quests (micro-swap, prediction) require wallet signing on the frontend and verification on the backend. All quest completions grant in-game resource/boost rewards. "Powered by Jupiter" branding throughout.

**Tech Stack:** Jupiter Ultra Swap API, Price API V3, Token API V2, Portfolio API, Prediction Market API. Hono backend proxy. React frontend quest panel.

---

## Task 1: Add Shared Types for Quests

**Files:**
- Modify: `packages/shared/src/types.ts`

**Step 1: Add quest types to shared types**

Add the following to the end of `packages/shared/src/types.ts`:

```typescript
// ── Jupiter Quests ──

export type QuestId =
  | "price_scout"      // Free daily: check a token price
  | "token_scan"       // Free daily: look up a token's info
  | "portfolio_check"  // Free daily: view your portfolio via Jupiter
  | "pnl_report"       // Free daily: check PnL on holdings
  | "micro_swap"       // Weekly: do a small swap via Jupiter
  | "prediction_bet";  // Weekly: place a micro prediction bet

export type QuestFrequency = "daily" | "weekly";

export interface QuestDefinition {
  id: QuestId;
  name: string;
  description: string;
  frequency: QuestFrequency;
  /** Whether the quest requires a wallet transaction (swap/bet) */
  requiresTx: boolean;
  reward: QuestReward;
}

export interface QuestReward {
  scrap?: number;
  crystal?: number;
  artifact?: number;
  /** Temporary boost: e.g. "+10% loot for 1h" */
  boost?: {
    type: "loot_chance" | "speed" | "xp";
    percentBonus: number;
    durationMinutes: number;
  };
}

export interface QuestProgress {
  questId: QuestId;
  completed: boolean;
  /** ISO date string of last completion */
  completedAt: string | null;
  /** Extra data from quest (token name, price, pnl, etc.) */
  result: Record<string, unknown> | null;
}

export interface QuestStatus {
  quests: (QuestDefinition & QuestProgress)[];
  /** Active temporary boosts from completed quests */
  activeBoosts: ActiveBoost[];
}

export interface ActiveBoost {
  type: "loot_chance" | "speed" | "xp";
  percentBonus: number;
  expiresAt: string; // ISO date
  source: QuestId;
}
```

**Step 2: Rebuild shared package**

Run: `pnpm --filter shared build`
Expected: Clean build, types exported.

**Step 3: Commit**

```bash
git add packages/shared/src/types.ts
git commit -m "feat: add Jupiter quest shared types"
```

---

## Task 2: Create Quest Definitions & Service (Backend)

**Files:**
- Create: `apps/api/src/services/quest-service.ts`

**Step 1: Create the quest service**

```typescript
import db from "../db/database.js";
import type {
  QuestId,
  QuestDefinition,
  QuestProgress,
  QuestStatus,
  ActiveBoost,
} from "@solanaidle/shared";

// ── Quest Definitions ──

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    id: "price_scout",
    name: "Price Scout",
    description: "Check the live price of any token",
    frequency: "daily",
    requiresTx: false,
    reward: { scrap: 20, boost: { type: "xp", percentBonus: 10, durationMinutes: 60 } },
  },
  {
    id: "token_scan",
    name: "Token Scan",
    description: "Look up a token's security & holder info",
    frequency: "daily",
    requiresTx: false,
    reward: { scrap: 15, crystal: 2 },
  },
  {
    id: "portfolio_check",
    name: "Portfolio Check",
    description: "Review your wallet holdings via Jupiter",
    frequency: "daily",
    requiresTx: false,
    reward: { scrap: 15, boost: { type: "loot_chance", percentBonus: 10, durationMinutes: 60 } },
  },
  {
    id: "pnl_report",
    name: "PnL Report",
    description: "Check profit & loss on your holdings",
    frequency: "daily",
    requiresTx: false,
    reward: { crystal: 3, boost: { type: "speed", percentBonus: 10, durationMinutes: 60 } },
  },
  {
    id: "micro_swap",
    name: "Micro Swap",
    description: "Swap a small amount via Jupiter (any pair)",
    frequency: "weekly",
    requiresTx: true,
    reward: { scrap: 50, crystal: 10, artifact: 1 },
  },
  {
    id: "prediction_bet",
    name: "Market Prediction",
    description: "Place a micro-bet on a prediction market",
    frequency: "weekly",
    requiresTx: true,
    reward: { crystal: 15, artifact: 1 },
  },
];

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekStartUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // Sunday
  return d.toISOString().slice(0, 10);
}

// ── DB Helpers ──

interface QuestRow {
  wallet_address: string;
  quest_id: string;
  completed_at: string;
  period_key: string; // "2026-02-14" for daily, "2026-02-09" (week start) for weekly
  result_json: string | null;
}

export function getQuestStatus(wallet: string, characterId: string): QuestStatus {
  const today = getTodayUTC();
  const weekStart = getWeekStartUTC();

  const rows = db
    .prepare(
      `SELECT * FROM quest_completions
       WHERE wallet_address = ?
       AND ((period_key = ?) OR (period_key = ?))`
    )
    .all(wallet, today, weekStart) as QuestRow[];

  const completionMap = new Map<string, QuestRow>();
  for (const row of rows) {
    completionMap.set(row.quest_id, row);
  }

  const quests = QUEST_DEFINITIONS.map((def) => {
    const row = completionMap.get(def.id);
    return {
      ...def,
      completed: !!row,
      completedAt: row?.completed_at ?? null,
      result: row?.result_json ? JSON.parse(row.result_json) : null,
    };
  });

  // Active boosts
  const boostRows = db
    .prepare(
      `SELECT quest_id, boost_type, boost_percent, expires_at
       FROM quest_boosts
       WHERE wallet_address = ? AND expires_at > datetime('now')`
    )
    .all(wallet) as { quest_id: string; boost_type: string; boost_percent: number; expires_at: string }[];

  const activeBoosts: ActiveBoost[] = boostRows.map((b) => ({
    type: b.boost_type as ActiveBoost["type"],
    percentBonus: b.boost_percent,
    expiresAt: b.expires_at,
    source: b.quest_id as QuestId,
  }));

  return { quests, activeBoosts };
}

export function completeQuest(
  wallet: string,
  characterId: string,
  questId: QuestId,
  result: Record<string, unknown> | null
): { success: boolean; message: string } {
  const def = QUEST_DEFINITIONS.find((d) => d.id === questId);
  if (!def) return { success: false, message: "Unknown quest" };

  const periodKey = def.frequency === "daily" ? getTodayUTC() : getWeekStartUTC();

  // Check if already completed this period
  const existing = db
    .prepare(
      "SELECT 1 FROM quest_completions WHERE wallet_address = ? AND quest_id = ? AND period_key = ?"
    )
    .get(wallet, questId, periodKey);

  if (existing) return { success: false, message: "Quest already completed this period" };

  // Insert completion
  db.prepare(
    `INSERT INTO quest_completions (wallet_address, quest_id, completed_at, period_key, result_json)
     VALUES (?, ?, datetime('now'), ?, ?)`
  ).run(wallet, questId, periodKey, result ? JSON.stringify(result) : null);

  // Grant resource rewards
  const r = def.reward;
  if (r.scrap || r.crystal || r.artifact) {
    db.prepare(
      "UPDATE inventories SET scrap = scrap + ?, crystal = crystal + ?, artifact = artifact + ? WHERE character_id = ?"
    ).run(r.scrap ?? 0, r.crystal ?? 0, r.artifact ?? 0, characterId);
  }

  // Grant boost
  if (r.boost) {
    db.prepare(
      `INSERT INTO quest_boosts (wallet_address, quest_id, boost_type, boost_percent, expires_at)
       VALUES (?, ?, ?, ?, datetime('now', '+' || ? || ' minutes'))`
    ).run(wallet, questId, r.boost.type, r.boost.percentBonus, r.boost.durationMinutes);
  }

  return { success: true, message: `Quest completed! +${r.scrap ?? 0} scrap, +${r.crystal ?? 0} crystal` };
}

/** Get total active boost for a given type (sum of all active boosts of that type) */
export function getActiveBoostPercent(wallet: string, boostType: string): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(boost_percent), 0) as total
       FROM quest_boosts
       WHERE wallet_address = ? AND boost_type = ? AND expires_at > datetime('now')`
    )
    .get(wallet, boostType) as { total: number };
  return row.total;
}
```

**Step 2: Commit**

```bash
git add apps/api/src/services/quest-service.ts
git commit -m "feat: add quest service with definitions and completion logic"
```

---

## Task 3: Add Quest DB Tables to Schema

**Files:**
- Modify: `apps/api/src/db/schema.ts`

**Step 1: Add quest tables**

Add these two table creation statements inside the `initSchema()` function:

```sql
CREATE TABLE IF NOT EXISTS quest_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  period_key TEXT NOT NULL,
  result_json TEXT,
  UNIQUE(wallet_address, quest_id, period_key)
);

CREATE TABLE IF NOT EXISTS quest_boosts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  boost_type TEXT NOT NULL,
  boost_percent REAL NOT NULL,
  expires_at TEXT NOT NULL
);
```

**Step 2: Commit**

```bash
git add apps/api/src/db/schema.ts
git commit -m "feat: add quest_completions and quest_boosts tables"
```

---

## Task 4: Create Jupiter API Proxy Service (Backend)

**Files:**
- Create: `apps/api/src/services/jupiter-service.ts`

**Step 1: Create Jupiter API proxy**

This service wraps Jupiter API calls so the frontend doesn't call Jupiter directly (CORS, rate limiting, caching).

```typescript
const JUP_BASE = "https://lite-api.jup.ag"; // free tier ~60 req/min

interface JupiterPriceResult {
  id: string;
  type: string;
  price: string;
}

interface JupiterTokenResult {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  tags: string[];
  logoURI: string | null;
  daily_volume: number | null;
}

export async function getTokenPrice(mintAddress: string): Promise<{
  price: number | null;
  mint: string;
}> {
  const res = await fetch(`${JUP_BASE}/price/v3?ids=${encodeURIComponent(mintAddress)}`);
  if (!res.ok) return { price: null, mint: mintAddress };
  const data = await res.json() as { data: Record<string, JupiterPriceResult> };
  const entry = data.data?.[mintAddress];
  return {
    price: entry ? parseFloat(entry.price) : null,
    mint: mintAddress,
  };
}

export async function searchToken(query: string): Promise<JupiterTokenResult[]> {
  const res = await fetch(
    `${JUP_BASE}/tokens/v2/search?query=${encodeURIComponent(query)}`
  );
  if (!res.ok) return [];
  const data = await res.json() as JupiterTokenResult[];
  return data.slice(0, 10); // limit results
}

export async function getWalletHoldings(walletAddress: string): Promise<{
  tokens: { mint: string; symbol: string; amount: number; usdValue: number | null }[];
  totalUsd: number;
}> {
  // Use Ultra holdings endpoint
  const res = await fetch(`${JUP_BASE}/ultra/v1/holdings/${walletAddress}`);
  if (!res.ok) return { tokens: [], totalUsd: 0 };
  const data = await res.json() as any;
  // Normalize response
  const tokens = (data.tokens ?? []).map((t: any) => ({
    mint: t.mint,
    symbol: t.symbol ?? "???",
    amount: t.amount ?? 0,
    usdValue: t.usdValue ?? null,
  }));
  const totalUsd = tokens.reduce((sum: number, t: any) => sum + (t.usdValue ?? 0), 0);
  return { tokens, totalUsd };
}

export async function getPredictionEvents(): Promise<{
  events: { id: string; title: string; status: string; markets: { id: string; question: string }[] }[];
}> {
  const res = await fetch(`${JUP_BASE}/events`);
  if (!res.ok) return { events: [] };
  const data = await res.json() as any;
  return {
    events: (data ?? []).slice(0, 10).map((e: any) => ({
      id: e.id,
      title: e.title,
      status: e.status,
      markets: (e.markets ?? []).slice(0, 3),
    })),
  };
}

/** Build an unsigned swap order via Jupiter Ultra */
export async function getSwapOrder(params: {
  inputMint: string;
  outputMint: string;
  amount: string; // in smallest unit (lamports)
  taker: string; // wallet pubkey
}): Promise<{ transaction: string | null; error: string | null }> {
  const url = new URL(`${JUP_BASE}/ultra/v1/order`);
  url.searchParams.set("inputMint", params.inputMint);
  url.searchParams.set("outputMint", params.outputMint);
  url.searchParams.set("amount", params.amount);
  url.searchParams.set("taker", params.taker);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.text().catch(() => "Unknown error");
    return { transaction: null, error: err };
  }
  const data = await res.json() as any;
  return { transaction: data.transaction ?? null, error: null };
}
```

**Step 2: Commit**

```bash
git add apps/api/src/services/jupiter-service.ts
git commit -m "feat: add Jupiter API proxy service"
```

---

## Task 5: Create Quest Routes (Backend)

**Files:**
- Create: `apps/api/src/routes/quests.ts`
- Modify: `apps/api/src/index.ts` (register route)

**Step 1: Create quest routes**

```typescript
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
import { getQuestStatus, completeQuest, QUEST_DEFINITIONS } from "../services/quest-service.js";
import {
  getTokenPrice,
  searchToken,
  getWalletHoldings,
  getPredictionEvents,
  getSwapOrder,
} from "../services/jupiter-service.js";
import type { QuestId } from "@solanaidle/shared";

type Env = { Variables: { wallet: string } };

const quests = new Hono<Env>();
quests.use("*", authMiddleware);

// GET /quests/status — all quest progress + active boosts
quests.get("/status", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character" }, 404);
  return c.json(getQuestStatus(wallet, char.id));
});

// POST /quests/price-scout — check a token price (free daily quest)
quests.post("/price-scout", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character" }, 404);

  const body = await c.req.json<{ mint: string }>().catch(() => ({ mint: "" }));
  if (!body.mint) return c.json({ error: "BAD_REQUEST", message: "mint required" }, 400);

  const priceData = await getTokenPrice(body.mint);
  if (priceData.price === null) {
    return c.json({ error: "BAD_REQUEST", message: "Could not fetch price for this token" }, 400);
  }

  const result = completeQuest(wallet, char.id, "price_scout", {
    mint: body.mint,
    price: priceData.price,
  });
  return c.json({ ...result, data: priceData });
});

// POST /quests/token-scan — look up token info (free daily quest)
quests.post("/token-scan", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character" }, 404);

  const body = await c.req.json<{ query: string }>().catch(() => ({ query: "" }));
  if (!body.query) return c.json({ error: "BAD_REQUEST", message: "query required" }, 400);

  const tokens = await searchToken(body.query);
  if (tokens.length === 0) {
    return c.json({ error: "BAD_REQUEST", message: "No tokens found" }, 400);
  }

  const result = completeQuest(wallet, char.id, "token_scan", {
    query: body.query,
    topResult: tokens[0].symbol,
  });
  return c.json({ ...result, data: { tokens } });
});

// POST /quests/portfolio-check — view wallet holdings (free daily quest)
quests.post("/portfolio-check", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character" }, 404);

  const holdings = await getWalletHoldings(wallet);

  const result = completeQuest(wallet, char.id, "portfolio_check", {
    tokenCount: holdings.tokens.length,
    totalUsd: holdings.totalUsd,
  });
  return c.json({ ...result, data: holdings });
});

// POST /quests/pnl-report — check PnL (free daily quest)
quests.post("/pnl-report", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character" }, 404);

  // Use holdings as PnL proxy (we don't have historical data)
  const holdings = await getWalletHoldings(wallet);

  const result = completeQuest(wallet, char.id, "pnl_report", {
    totalUsd: holdings.totalUsd,
    topHolding: holdings.tokens[0]?.symbol ?? "none",
  });
  return c.json({ ...result, data: holdings });
});

// GET /quests/swap-order — get unsigned swap tx (for micro_swap quest)
quests.get("/swap-order", async (c) => {
  const wallet = c.get("wallet");
  const inputMint = c.req.query("inputMint") ?? "";
  const outputMint = c.req.query("outputMint") ?? "";
  const amount = c.req.query("amount") ?? "";

  if (!inputMint || !outputMint || !amount) {
    return c.json({ error: "BAD_REQUEST", message: "inputMint, outputMint, amount required" }, 400);
  }

  const order = await getSwapOrder({ inputMint, outputMint, amount, taker: wallet });
  if (order.error) {
    return c.json({ error: "SWAP_FAILED", message: order.error }, 400);
  }
  return c.json(order);
});

// POST /quests/micro-swap — confirm swap was executed (weekly quest)
quests.post("/micro-swap", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character" }, 404);

  const body = await c.req.json<{ signature: string }>().catch(() => ({ signature: "" }));
  if (!body.signature) {
    return c.json({ error: "BAD_REQUEST", message: "Transaction signature required" }, 400);
  }

  // TODO: Optionally verify signature on-chain in production
  const result = completeQuest(wallet, char.id, "micro_swap", {
    signature: body.signature,
  });
  return c.json(result);
});

// GET /quests/predictions — list prediction events
quests.get("/predictions", async (c) => {
  const events = await getPredictionEvents();
  return c.json(events);
});

// POST /quests/prediction-bet — confirm prediction bet was placed (weekly quest)
quests.post("/prediction-bet", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character" }, 404);

  const body = await c.req.json<{ marketId: string; signature: string }>().catch(() => ({ marketId: "", signature: "" }));
  if (!body.signature || !body.marketId) {
    return c.json({ error: "BAD_REQUEST", message: "marketId and signature required" }, 400);
  }

  const result = completeQuest(wallet, char.id, "prediction_bet", {
    marketId: body.marketId,
    signature: body.signature,
  });
  return c.json(result);
});

export default quests;
```

**Step 2: Register route in index.ts**

Add to `apps/api/src/index.ts`:

```typescript
import quests from "./routes/quests.js";
// ... after other app.route() calls:
app.route("/quests", quests);
```

**Step 3: Commit**

```bash
git add apps/api/src/routes/quests.ts apps/api/src/index.ts
git commit -m "feat: add quest API routes with Jupiter integration"
```

---

## Task 6: Wire Quest Boosts Into Game Logic

**Files:**
- Modify: `apps/api/src/services/mission-service.ts` (or wherever mission rewards/timers are calculated)

**Step 1: Apply boosts to mission rewards and timers**

Find where mission duration, loot drop chance, and XP rewards are calculated. Add calls to `getActiveBoostPercent(wallet, "speed"|"loot_chance"|"xp")` and apply as percentage bonus.

Example integration points:
- **Speed boost**: Reduce mission duration by boost % (e.g. 10% = 90% duration)
- **Loot chance boost**: Add boost % to base loot drop chance
- **XP boost**: Multiply XP reward by `1 + (boost / 100)`

This is a light touch — just read the boost and apply it where the existing calculation happens.

**Step 2: Commit**

```bash
git add apps/api/src/services/mission-service.ts
git commit -m "feat: apply quest boosts to mission rewards and timers"
```

---

## Task 7: Add useQuests Hook (Frontend)

**Files:**
- Create: `apps/web/src/hooks/useQuests.ts`

**Step 1: Create the quest hook**

```typescript
import { useState, useCallback } from "react";
import type { QuestStatus } from "@solanaidle/shared";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("auth_token");
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  }).then((r) => r.json() as Promise<T>);
}

export function useQuests() {
  const [status, setStatus] = useState<QuestStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<QuestStatus>("/quests/status");
      setStatus(data);
    } catch (e) {
      console.error("Failed to fetch quest status", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const completePriceScout = useCallback(async (mint: string) => {
    const res = await api<any>("/quests/price-scout", {
      method: "POST",
      body: JSON.stringify({ mint }),
    });
    await refresh();
    return res;
  }, [refresh]);

  const completeTokenScan = useCallback(async (query: string) => {
    const res = await api<any>("/quests/token-scan", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
    await refresh();
    return res;
  }, [refresh]);

  const completePortfolioCheck = useCallback(async () => {
    const res = await api<any>("/quests/portfolio-check", { method: "POST" });
    await refresh();
    return res;
  }, [refresh]);

  const completePnlReport = useCallback(async () => {
    const res = await api<any>("/quests/pnl-report", { method: "POST" });
    await refresh();
    return res;
  }, [refresh]);

  const completeMicroSwap = useCallback(async (signature: string) => {
    const res = await api<any>("/quests/micro-swap", {
      method: "POST",
      body: JSON.stringify({ signature }),
    });
    await refresh();
    return res;
  }, [refresh]);

  const completePredictionBet = useCallback(async (marketId: string, signature: string) => {
    const res = await api<any>("/quests/prediction-bet", {
      method: "POST",
      body: JSON.stringify({ marketId, signature }),
    });
    await refresh();
    return res;
  }, [refresh]);

  const getSwapOrder = useCallback(async (inputMint: string, outputMint: string, amount: string) => {
    return api<any>(`/quests/swap-order?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}`);
  }, []);

  const getPredictions = useCallback(async () => {
    return api<any>("/quests/predictions");
  }, []);

  return {
    status,
    loading,
    refresh,
    completePriceScout,
    completeTokenScan,
    completePortfolioCheck,
    completePnlReport,
    completeMicroSwap,
    completePredictionBet,
    getSwapOrder,
    getPredictions,
  };
}
```

**Step 2: Commit**

```bash
git add apps/web/src/hooks/useQuests.ts
git commit -m "feat: add useQuests hook for Jupiter quest integration"
```

---

## Task 8: Build Quest Panel UI (Frontend)

**Files:**
- Create: `apps/web/src/features/game/QuestPanel.tsx`

**Step 1: Create the quest panel component**

This is the main quest UI that shows inside a new "Intel" tab (or sub-panel). Design notes:
- "Powered by Jupiter" banner at the top using the existing SVG
- Two sections: "Daily Intel" (4 free quests) and "Weekly Ops" (2 tx quests)
- Each quest card shows: name, description, reward preview, completion status, action button
- Completed quests show a green checkmark and result data
- Active boosts shown as a horizontal bar above the quests
- Consistent with existing neon/cyberpunk styling (bg-[#0d1525], neon-green, neon-amber, etc.)

Key UI structure:

```tsx
import { useQuests } from "../../hooks/useQuests";
import poweredByJupiter from "../../assets/icons/poweredbyjupiter-dark.svg";

// Jupiter branding header
<div className="flex items-center justify-center py-2">
  <img src={poweredByJupiter} alt="Powered by Jupiter" className="h-6 opacity-80" />
</div>

// Active boosts bar (if any)
// Daily Intel section — 4 quest cards in 2x2 grid
// Weekly Ops section — 2 quest cards side by side
```

Each quest card:
- If NOT completed → shows action button (e.g. "Scan" for token_scan, "Check" for portfolio)
- Price Scout and Token Scan show a text input for mint/query
- Portfolio Check and PnL Report are one-click (use connected wallet)
- Micro Swap shows a mini swap interface (SOL→USDC, small preset amount)
- Prediction Bet shows a list of active markets to bet on

**Step 2: Commit**

```bash
git add apps/web/src/features/game/QuestPanel.tsx
git commit -m "feat: add QuestPanel UI with Jupiter branding"
```

---

## Task 9: Add "Intel" Tab to GameDashboard

**Files:**
- Modify: `apps/web/src/features/game/GameDashboard.tsx`

**Step 1: Add Intel tab**

Add a new tab alongside the existing tabs (game, inventory, skills, guild, ranks). Place it between "game" and "inventory":

- Tab icon: `<Radio />` from lucide-react (or `<Satellite />`)
- Tab label: "Intel"
- Renders `<QuestPanel />` when active
- Auto-fetches quest status when tab is selected

**Step 2: Commit**

```bash
git add apps/web/src/features/game/GameDashboard.tsx
git commit -m "feat: add Intel tab for Jupiter quests to GameDashboard"
```

---

## Task 10: Add Quest Cleanup to Dev Reset

**Files:**
- Modify: `apps/api/src/index.ts` (dev routes)

**Step 1: Add quest cleanup to reset-player**

In the `/dev/reset-player` endpoint, add:

```typescript
db.prepare("DELETE FROM quest_completions WHERE wallet_address = ?").run(payload.wallet);
db.prepare("DELETE FROM quest_boosts WHERE wallet_address = ?").run(payload.wallet);
```

**Step 2: Commit**

```bash
git add apps/api/src/index.ts
git commit -m "feat: add quest data cleanup to dev reset-player"
```

---

## Task 11: Update API.md Documentation

**Files:**
- Modify: `docs/API.md`

**Step 1: Add quest endpoints to API docs**

Add a new section documenting:
- `GET /quests/status` — returns QuestStatus
- `POST /quests/price-scout` — body: `{ mint }`, completes price_scout quest
- `POST /quests/token-scan` — body: `{ query }`, completes token_scan quest
- `POST /quests/portfolio-check` — no body, completes portfolio_check quest
- `POST /quests/pnl-report` — no body, completes pnl_report quest
- `GET /quests/swap-order` — params: inputMint, outputMint, amount
- `POST /quests/micro-swap` — body: `{ signature }`, completes micro_swap quest
- `GET /quests/predictions` — returns prediction market events
- `POST /quests/prediction-bet` — body: `{ marketId, signature }`, completes prediction_bet quest

**Step 2: Commit**

```bash
git add docs/API.md
git commit -m "docs: add quest API endpoints to API.md"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Shared types | `packages/shared/src/types.ts` |
| 2 | Quest service | `apps/api/src/services/quest-service.ts` |
| 3 | DB schema | `apps/api/src/db/schema.ts` |
| 4 | Jupiter proxy | `apps/api/src/services/jupiter-service.ts` |
| 5 | Quest routes | `apps/api/src/routes/quests.ts`, `apps/api/src/index.ts` |
| 6 | Boost wiring | `apps/api/src/services/mission-service.ts` |
| 7 | useQuests hook | `apps/web/src/hooks/useQuests.ts` |
| 8 | QuestPanel UI | `apps/web/src/features/game/QuestPanel.tsx` |
| 9 | Intel tab | `apps/web/src/features/game/GameDashboard.tsx` |
| 10 | Dev cleanup | `apps/api/src/index.ts` |
| 11 | API docs | `docs/API.md` |

Total: 11 tasks, ~6 new files, ~4 modified files.
