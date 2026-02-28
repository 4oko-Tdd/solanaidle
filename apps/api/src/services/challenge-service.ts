import db from "../db/database.js";
import type { ChallengeDefinition, ChallengeType } from "@solanaidle/shared";

export const CHALLENGE_REROLL_COST = 8;

const ALL_CHALLENGES: ChallengeDefinition[] = [
  { id: "missions_2", description: "Complete 2 missions", requirement: 2, rewardScrap: 60, rewardCrystal: 0, type: "missions" },
  { id: "missions_4", description: "Complete 4 missions", requirement: 4, rewardScrap: 120, rewardCrystal: 0, type: "missions" },
  { id: "earn_scrap_200", description: "Earn 200 Scrap", requirement: 200, rewardScrap: 50, rewardCrystal: 0, type: "scrap" },
  { id: "earn_crystal_20", description: "Earn 20 Tokens", requirement: 20, rewardScrap: 0, rewardCrystal: 10, type: "crystal" },
  { id: "survive_expedition", description: "Complete a Liquidity Run", requirement: 1, rewardScrap: 80, rewardCrystal: 5, type: "liquidity_run" },
  { id: "join_boss", description: "Join the boss hunt", requirement: 1, rewardScrap: 0, rewardCrystal: 15, type: "boss_join" },
  { id: "use_overload", description: "Use OVERLOAD on the boss", requirement: 1, rewardScrap: 0, rewardCrystal: 20, type: "overload" },
  { id: "start_raid", description: "Start a guild raid", requirement: 1, rewardScrap: 100, rewardCrystal: 0, type: "raid" },
  { id: "earn_scrap_400", description: "Earn 400 Scrap total today", requirement: 400, rewardScrap: 80, rewardCrystal: 0, type: "scrap" },
];

export function getTodayPeriodKey(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/** Seeded deterministic 3-pick — same challenges for all players each day */
function getDailyChallengeIds(periodKey: string): string[] {
  // FNV-1a style: position-sensitive, produces unique seed per calendar date
  let seed = 2166136261;
  for (const c of periodKey) {
    seed = (Math.imul(seed ^ c.charCodeAt(0), 16777619)) >>> 0;
  }
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const pool = [...ALL_CHALLENGES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3).map(c => c.id);
}

export function getDailyChallenges(wallet: string) {
  const periodKey = getTodayPeriodKey();
  const baseIds = getDailyChallengeIds(periodKey);

  // Collect rerolled quest IDs for today
  const rerolled = db.prepare(
    "SELECT quest_id FROM quest_boosts WHERE wallet_address = ? AND boost_type = 'challenge_reroll' AND expires_at > datetime('now')"
  ).all(wallet) as { quest_id: string }[];
  const rerolledSet = new Set(rerolled.map(r => r.quest_id));

  // For each rerolled slot, deterministically pick a replacement from remaining pool
  const finalIds = baseIds.map((id, slot) => {
    if (!rerolledSet.has(id)) return id;
    // FNV-1a style: position-sensitive, slot changes the result meaningfully
    let seed2 = 2166136261;
    for (const c of periodKey) {
      seed2 = (Math.imul(seed2 ^ c.charCodeAt(0), 16777619)) >>> 0;
    }
    seed2 = (Math.imul(seed2 ^ slot, 16777619)) >>> 0;
    const next2 = () => {
      seed2 = (Math.imul(seed2, 1664525) + 1013904223) >>> 0;
      return seed2 / 0xffffffff;
    };
    const rest = ALL_CHALLENGES.filter(c => !baseIds.includes(c.id));
    return rest[Math.floor(next2() * rest.length)]?.id ?? id;
  });

  // Get completions and progress
  const completions = db.prepare(
    "SELECT quest_id FROM quest_completions WHERE wallet_address = ? AND period_key = ?"
  ).all(wallet, periodKey) as { quest_id: string }[];
  const completedSet = new Set(completions.map(c => c.quest_id));

  const progressRows = db.prepare(
    "SELECT quest_id, progress FROM challenge_progress WHERE wallet_address = ? AND period_key = ?"
  ).all(wallet, periodKey) as { quest_id: string; progress: number }[];
  const progressMap = new Map(progressRows.map(r => [r.quest_id, r.progress]));

  return {
    challenges: finalIds.map(id => {
      const def = ALL_CHALLENGES.find(c => c.id === id)!;
      return {
        ...def,
        progress: progressMap.get(id) ?? 0,
        completed: completedSet.has(id),
        rerolled: rerolledSet.has(baseIds[finalIds.indexOf(id)]),
      };
    }),
    periodKey,
    rerollCost: CHALLENGE_REROLL_COST,
  };
}

/** Call this from mission/boss/raid services on relevant events. */
export function trackChallengeProgress(
  wallet: string,
  type: ChallengeType,
  amount: number,
  characterId: string
): void {
  const periodKey = getTodayPeriodKey();
  const { challenges } = getDailyChallenges(wallet);

  for (const ch of challenges) {
    if (ch.completed || ch.type !== type) continue;
    const next = Math.min(ch.progress + amount, ch.requirement);
    db.prepare(`
      INSERT INTO challenge_progress (wallet_address, quest_id, period_key, progress)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(wallet_address, quest_id, period_key) DO UPDATE SET progress = excluded.progress
    `).run(wallet, ch.id, periodKey, next);

    if (next >= ch.requirement && !ch.completed) {
      db.prepare(`
        INSERT OR IGNORE INTO quest_completions (wallet_address, quest_id, period_key, completed_at, result_json)
        VALUES (?, ?, ?, datetime('now'), ?)
      `).run(wallet, ch.id, periodKey, JSON.stringify({ rewardScrap: ch.rewardScrap, rewardCrystal: ch.rewardCrystal }));

      if (ch.rewardScrap > 0 || ch.rewardCrystal > 0) {
        db.prepare("UPDATE inventories SET scrap = scrap + ?, crystal = crystal + ? WHERE character_id = ?")
          .run(ch.rewardScrap, ch.rewardCrystal, characterId);
      }
    }
  }
}

export function rerollChallenge(wallet: string, questId: string): void {
  const periodKey = getTodayPeriodKey();
  const expiresAt = `${periodKey}T23:59:59Z`;
  db.prepare(`
    INSERT INTO quest_boosts (wallet_address, quest_id, boost_type, boost_percent, expires_at)
    VALUES (?, ?, 'challenge_reroll', 0, ?)
  `).run(wallet, questId, expiresAt);
}
