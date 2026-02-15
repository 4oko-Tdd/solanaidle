import { randomUUID } from "crypto";
import db from "../db/database.js";
import { mintBadge, isMintingAvailable } from "./metaplex-service.js";
import { getWeekBounds } from "./run-service.js";
import type { AchievementId } from "@solanaidle/shared";

interface AchievementDef {
  id: AchievementId;
  name: string;
  trigger: string;
  check: (ctx: TriggerContext) => boolean;
}

interface TriggerContext {
  wallet: string;
  characterId: string;
  trigger: string;
  streak?: number;
  totalMissions?: number;
  score?: number;
  rank?: number;
}

const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "boss_slayer",
    name: "Boss Slayer",
    trigger: "boss_kill",
    check: () => true, // If triggered on boss_kill, condition is met
  },
  {
    id: "streak_master",
    name: "Streak Legend",
    trigger: "mission_success",
    check: (ctx) => (ctx.streak ?? 0) >= 10,
  },
  {
    id: "deep_explorer",
    name: "Deep Explorer",
    trigger: "mission_success",
    check: (ctx) => (ctx.totalMissions ?? 0) >= 50,
  },
  {
    id: "raid_victor",
    name: "Raid Victor",
    trigger: "raid_claim",
    check: () => true,
  },
  {
    id: "epoch_champion",
    name: "Epoch Champion",
    trigger: "run_end",
    check: (ctx) => (ctx.rank ?? 999) === 1,
  },
];

/** Check and grant any newly earned achievements. Fire-and-forget safe. */
export async function checkAndGrantAchievements(
  wallet: string,
  characterId: string,
  trigger: string,
  context: Partial<TriggerContext> = {}
): Promise<void> {
  const ctx: TriggerContext = { wallet, characterId, trigger, ...context };

  // Compute totalMissions if needed (sum across all weekly_runs)
  if (trigger === "mission_success" && ctx.totalMissions === undefined) {
    const row = db
      .prepare(
        "SELECT COALESCE(SUM(missions_completed), 0) as total FROM weekly_runs WHERE wallet_address = ?"
      )
      .get(wallet) as { total: number };
    ctx.totalMissions = row.total;
  }

  const relevant = ACHIEVEMENTS.filter((a) => a.trigger === trigger);

  for (const achievement of relevant) {
    if (!achievement.check(ctx)) continue;

    // Check not already earned
    const existing = db
      .prepare(
        "SELECT id FROM achievement_badges WHERE wallet_address = ? AND achievement_id = ?"
      )
      .get(wallet, achievement.id);
    if (existing) continue;

    // Grant achievement
    const id = randomUUID();
    const { weekStart } = getWeekBounds();
    let mintAddress: string | null = null;

    // Try to mint on-chain
    if (isMintingAvailable()) {
      try {
        const result = await mintBadge(wallet, achievement.name, {
          achievement: achievement.id,
          earned_at: new Date().toISOString(),
          epoch: weekStart,
          stat_value: getStatValue(achievement.id, ctx),
        });
        mintAddress = result.mintAddress;
      } catch (err) {
        console.error(`Failed to mint badge ${achievement.id}:`, err);
      }
    }

    db.prepare(
      "INSERT INTO achievement_badges (id, wallet_address, achievement_id, mint_address) VALUES (?, ?, ?, ?)"
    ).run(id, wallet, achievement.id, mintAddress);

    console.log(`Achievement unlocked: ${achievement.name} for ${wallet.slice(0, 8)}...`);
  }
}

/** Get all earned badges for a wallet */
export function getEarnedBadges(wallet: string) {
  return db
    .prepare(
      "SELECT id, achievement_id, earned_at, mint_address FROM achievement_badges WHERE wallet_address = ? ORDER BY earned_at DESC"
    )
    .all(wallet) as {
    id: string;
    achievement_id: string;
    earned_at: string;
    mint_address: string | null;
  }[];
}

/** Get the display name for an achievement */
export function getAchievementName(achievementId: string): string {
  return ACHIEVEMENTS.find((a) => a.id === achievementId)?.name ?? achievementId;
}

function getStatValue(achievementId: AchievementId, ctx: TriggerContext): string {
  switch (achievementId) {
    case "streak_master":
      return String(ctx.streak ?? 0);
    case "deep_explorer":
      return String(ctx.totalMissions ?? 0);
    case "epoch_champion":
      return String(ctx.score ?? 0);
    default:
      return "1";
  }
}
