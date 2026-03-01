import db from "../db/database.js";
import crypto from "crypto";
import type { ActiveRaid, RaidId } from "@solanaidle/shared";
import { getRaid, RAIDS } from "./game-config.js";
import { getGuildByMember, getGuildMembers } from "./guild-service.js";
import { checkAndGrantAchievements } from "./achievement-service.js";
import { trackChallengeProgress } from "./challenge-service.js";
import { incrementLifetimeStat } from "./milestone-service.js";

// Get all raids + current member count (client handles locked state)
export function getAvailableRaids(guildId: string): { raids: typeof RAIDS, memberCount: number } {
  const row = db
    .prepare("SELECT COUNT(*) as count FROM guild_members WHERE guild_id = ?")
    .get(guildId) as any;
  return { raids: RAIDS, memberCount: row.count as number };
}

// Get active raid for a guild
export function getActiveRaid(guildId: string): ActiveRaid | null {
  const row = db
    .prepare(
      "SELECT * FROM active_raids WHERE guild_id = ? ORDER BY started_at DESC LIMIT 1"
    )
    .get(guildId) as any;
  if (!row) return null;

  const participants = db
    .prepare(
      "SELECT wallet_address FROM raid_participants WHERE raid_id = ?"
    )
    .all(row.id) as any[];

  const now = Date.now();
  const endsAt = new Date(row.ends_at).getTime();
  const timeRemaining = Math.max(0, Math.floor((endsAt - now) / 1000));

  return {
    id: row.id,
    raidId: row.raid_id as RaidId,
    guildId: row.guild_id,
    startedAt: row.started_at,
    endsAt: row.ends_at,
    committedPlayers: participants.map((p: any) => p.wallet_address),
    timeRemaining,
  };
}

// Start a new raid (first player commits)
export function startRaid(
  guildId: string,
  raidId: string,
  wallet: string
): ActiveRaid {
  const raid = getRaid(raidId);
  if (!raid) throw new Error("Invalid raid");

  // Check no active raid
  const active = getActiveRaid(guildId);
  if (active && new Date(active.endsAt).getTime() > Date.now()) {
    throw new Error("RAID_IN_PROGRESS");
  }

  // If there's an expired unclaimed raid, clean it up
  if (active) {
    db.prepare("DELETE FROM raid_participants WHERE raid_id = ?").run(
      active.id
    );
    db.prepare("DELETE FROM active_raids WHERE id = ?").run(active.id);
  }

  // Check guild has enough members
  const memberCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM guild_members WHERE guild_id = ?"
    )
    .get(guildId) as any;
  if (memberCount.count < raid.requiredPlayers) {
    throw new Error("RAID_NOT_READY");
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const endsAt = new Date(now.getTime() + raid.duration * 1000);

  db.prepare(
    "INSERT INTO active_raids (id, raid_id, guild_id, started_at, ends_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, raidId, guildId, now.toISOString(), endsAt.toISOString());

  // Auto-commit all guild members who have a character
  const guildMembers = db
    .prepare("SELECT wallet_address FROM guild_members WHERE guild_id = ?")
    .all(guildId) as any[];
  const insertParticipant = db.prepare(
    "INSERT INTO raid_participants (raid_id, wallet_address, character_id) VALUES (?, ?, ?)"
  );
  let initiatorCharId: string | null = null;
  for (const member of guildMembers) {
    const char = db
      .prepare("SELECT id FROM characters WHERE wallet_address = ?")
      .get(member.wallet_address) as any;
    if (char) {
      insertParticipant.run(id, member.wallet_address, char.id);
      if (member.wallet_address === wallet) {
        initiatorCharId = char.id;
      }
    }
  }

  // Track challenge progress for the initiator
  if (initiatorCharId) {
    try {
      trackChallengeProgress(wallet, "raid", 1, initiatorCharId);
    } catch {}
  }

  return getActiveRaid(guildId)!;
}

// Commit to an active raid (additional players join)
export function commitToRaid(
  guildId: string,
  wallet: string
): ActiveRaid {
  const active = getActiveRaid(guildId);
  if (!active) throw new Error("RAID_NOT_READY");

  // Already committed — idempotent
  if (active.committedPlayers.includes(wallet)) {
    return active;
  }

  const char = db
    .prepare("SELECT id FROM characters WHERE wallet_address = ?")
    .get(wallet) as any;
  if (!char) throw new Error("CHARACTER_NOT_FOUND");

  db.prepare(
    "INSERT INTO raid_participants (raid_id, wallet_address, character_id) VALUES (?, ?, ?)"
  ).run(active.id, wallet, char.id);

  return getActiveRaid(guildId)!;
}

// Claim raid rewards (after timer completes)
export function claimRaid(
  guildId: string,
  wallet: string
): { lootMultiplier: number; rewards: { scrap: number; crystal: number } } {
  const active = getActiveRaid(guildId);
  if (!active) throw new Error("RAID_NOT_READY");
  if (active.timeRemaining && active.timeRemaining > 0)
    throw new Error("RAID_IN_PROGRESS");

  // Check player participated
  if (!active.committedPlayers.includes(wallet)) {
    throw new Error("NOT_IN_GUILD");
  }

  const raid = getRaid(active.raidId);
  if (!raid) throw new Error("Invalid raid");

  // Check required players committed
  if (active.committedPlayers.length < raid.requiredPlayers) {
    throw new Error("RAID_NOT_READY");
  }

  // Give rewards to the claiming player
  const baseScrap = 100 * raid.lootMultiplier;
  const baseCrystal =
    raid.id === "stronghold"
      ? 25 * raid.lootMultiplier
      : 10 * raid.lootMultiplier;

  const char = db
    .prepare("SELECT id FROM characters WHERE wallet_address = ?")
    .get(wallet) as any;

  db.prepare(
    "UPDATE inventories SET scrap = scrap + ?, crystal = crystal + ? WHERE character_id = ?"
  ).run(baseScrap, baseCrystal, char.id);

  // Remove participant so they can't double-claim
  db.prepare(
    "DELETE FROM raid_participants WHERE raid_id = ? AND wallet_address = ?"
  ).run(active.id, wallet);

  // If all participants have claimed, clean up the raid
  const remaining = db
    .prepare(
      "SELECT COUNT(*) as count FROM raid_participants WHERE raid_id = ?"
    )
    .get(active.id) as any;
  if (remaining.count === 0) {
    db.prepare("DELETE FROM active_raids WHERE id = ?").run(active.id);
  }

  // Achievement: Raid Victor
  checkAndGrantAchievements(wallet, char.id, "raid_claim", {}).catch(() => {});

  // Track lifetime stat for cosmetic milestones
  try { incrementLifetimeStat(wallet, "raids_completed"); } catch {}

  return {
    lootMultiplier: raid.lootMultiplier,
    rewards: { scrap: baseScrap, crystal: baseCrystal },
  };
}
