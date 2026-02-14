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
    description: "Check a token price on Jupiter",
    frequency: "daily",
    requiresTx: false,
    reward: {
      scrap: 20,
      boost: { type: "xp", percentBonus: 10, durationMinutes: 60 },
    },
  },
  {
    id: "token_scan",
    name: "Token Scan",
    description: "Look up a token's info via Jupiter",
    frequency: "daily",
    requiresTx: false,
    reward: { scrap: 15, crystal: 2 },
  },
  {
    id: "portfolio_check",
    name: "Portfolio Check",
    description: "View your portfolio via Jupiter",
    frequency: "daily",
    requiresTx: false,
    reward: {
      scrap: 15,
      boost: { type: "loot_chance", percentBonus: 10, durationMinutes: 60 },
    },
  },
  {
    id: "pnl_report",
    name: "PnL Report",
    description: "Check PnL on your holdings",
    frequency: "daily",
    requiresTx: false,
    reward: {
      crystal: 3,
      boost: { type: "speed", percentBonus: 10, durationMinutes: 60 },
    },
  },
  {
    id: "micro_swap",
    name: "Micro Swap",
    description: "Perform a small swap via Jupiter",
    frequency: "weekly",
    requiresTx: true,
    reward: { scrap: 50, crystal: 10, artifact: 1 },
  },
  {
    id: "prediction_bet",
    name: "Prediction Bet",
    description: "Place a micro prediction bet",
    frequency: "weekly",
    requiresTx: true,
    reward: { crystal: 15, artifact: 1 },
  },
];

// ── Date Helpers (private) ──

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function getWeekStartUTC(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // Monday-based week start
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  return monday.toISOString().slice(0, 10);
}

// ── DB Row Interfaces ──

interface CompletionRow {
  quest_id: string;
  completed_at: string;
  result: string | null;
}

interface BoostRow {
  boost_type: string;
  boost_percent: number;
  expires_at: string;
  quest_id: string;
}

// ── Public API ──

export function getQuestStatus(
  wallet: string,
  characterId: string
): QuestStatus {
  const today = getTodayUTC();
  const weekStart = getWeekStartUTC();

  // Fetch daily completions (completed today)
  const dailyCompletions = db
    .prepare(
      `SELECT quest_id, completed_at, result FROM quest_completions
       WHERE wallet_address = ? AND character_id = ?
         AND DATE(completed_at) = ?`
    )
    .all(wallet, characterId, today) as CompletionRow[];

  // Fetch weekly completions (completed this week)
  const weeklyCompletions = db
    .prepare(
      `SELECT quest_id, completed_at, result FROM quest_completions
       WHERE wallet_address = ? AND character_id = ?
         AND DATE(completed_at) >= ?`
    )
    .all(wallet, characterId, weekStart) as CompletionRow[];

  const completionMap = new Map<string, CompletionRow>();
  for (const row of dailyCompletions) {
    completionMap.set(row.quest_id, row);
  }
  for (const row of weeklyCompletions) {
    completionMap.set(row.quest_id, row);
  }

  // Fetch active boosts
  const boostRows = db
    .prepare(
      `SELECT boost_type, boost_percent, expires_at, quest_id FROM quest_boosts
       WHERE wallet_address = ? AND expires_at > datetime('now')`
    )
    .all(wallet) as BoostRow[];

  const activeBoosts: ActiveBoost[] = boostRows.map((b) => ({
    type: b.boost_type as ActiveBoost["type"],
    percentBonus: b.boost_percent,
    expiresAt: b.expires_at,
    source: b.quest_id as QuestId,
  }));

  // Merge definitions with progress
  const quests = QUEST_DEFINITIONS.map((def) => {
    const completion = completionMap.get(def.id);
    const progress: QuestProgress = {
      questId: def.id,
      completed: !!completion,
      completedAt: completion?.completed_at ?? null,
      result: completion?.result ? JSON.parse(completion.result) : null,
    };
    return { ...def, ...progress };
  });

  return { quests, activeBoosts };
}

export function completeQuest(
  wallet: string,
  characterId: string,
  questId: string,
  result: Record<string, unknown> | null
): { success: boolean; message: string } {
  // Validate quest exists
  const questDef = QUEST_DEFINITIONS.find((q) => q.id === questId);
  if (!questDef) {
    return { success: false, message: "Unknown quest" };
  }

  // Check if already completed this period
  const periodStart =
    questDef.frequency === "daily" ? getTodayUTC() : getWeekStartUTC();

  const existing = db
    .prepare(
      `SELECT 1 FROM quest_completions
       WHERE wallet_address = ? AND character_id = ? AND quest_id = ?
         AND DATE(completed_at) >= ?`
    )
    .get(wallet, characterId, questId, periodStart);

  if (existing) {
    return {
      success: false,
      message: `Quest already completed this ${questDef.frequency === "daily" ? "day" : "week"}`,
    };
  }

  // Run all writes in a transaction
  const runTransaction = db.transaction(() => {
    const now = new Date().toISOString();

    // Insert completion
    db.prepare(
      `INSERT INTO quest_completions (wallet_address, character_id, quest_id, completed_at, result)
       VALUES (?, ?, ?, ?, ?)`
    ).run(wallet, characterId, questId, now, result ? JSON.stringify(result) : null);

    // Grant resource rewards
    const r = questDef.reward;
    const scrap = r.scrap ?? 0;
    const crystal = r.crystal ?? 0;
    const artifact = r.artifact ?? 0;

    if (scrap > 0 || crystal > 0 || artifact > 0) {
      db.prepare(
        `UPDATE inventories
         SET scrap = scrap + ?, crystal = crystal + ?, artifact = artifact + ?
         WHERE character_id = ?`
      ).run(scrap, crystal, artifact, characterId);
    }

    // Grant boost if applicable
    if (r.boost) {
      const expiresAt = new Date(
        Date.now() + r.boost.durationMinutes * 60 * 1000
      ).toISOString();

      db.prepare(
        `INSERT INTO quest_boosts (wallet_address, quest_id, boost_type, boost_percent, expires_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(wallet, questId, r.boost.type, r.boost.percentBonus, expiresAt);
    }
  });

  runTransaction();

  return { success: true, message: "Quest completed" };
}

export function getActiveBoostPercent(
  wallet: string,
  boostType: string
): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(boost_percent), 0) AS total FROM quest_boosts
       WHERE wallet_address = ? AND boost_type = ? AND expires_at > datetime('now')`
    )
    .get(wallet, boostType) as { total: number };

  return row.total;
}
