import { randomUUID } from "crypto";
import db from "../db/database.js";
import {
  getMission,
  getFailRateReduction,
  REVIVE_COOLDOWN_MS,
  XP_PER_LEVEL,
  NFT_NAMES,
} from "./game-config.js";
import type { ActiveMission, MissionClaimResponse, MissionId } from "@solanaidle/shared";

interface MissionRow {
  id: string;
  character_id: string;
  mission_id: string;
  started_at: string;
  ends_at: string;
}

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

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getActiveMission(characterId: string): ActiveMission | null {
  const row = db
    .prepare("SELECT * FROM active_missions WHERE character_id = ?")
    .get(characterId) as MissionRow | undefined;
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

export function startMission(
  characterId: string,
  missionId: string
): ActiveMission {
  const mission = getMission(missionId);
  if (!mission) throw new Error("Invalid mission");

  const now = new Date();
  const endsAt = new Date(now.getTime() + mission.duration * 1000);

  const id = randomUUID();
  db.prepare(
    "INSERT INTO active_missions (id, character_id, mission_id, started_at, ends_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, characterId, missionId, now.toISOString(), endsAt.toISOString());

  db.prepare("UPDATE characters SET state = 'on_mission' WHERE id = ?").run(
    characterId
  );

  return {
    missionId: mission.id,
    startedAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

export function claimMission(
  characterId: string,
  gearLevel: number
): MissionClaimResponse {
  const missionRow = db
    .prepare("SELECT * FROM active_missions WHERE character_id = ?")
    .get(characterId) as MissionRow | undefined;
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
    const reviveAt = new Date(
      Date.now() + REVIVE_COOLDOWN_MS
    ).toISOString();
    db.prepare(
      "UPDATE characters SET state = 'dead', revive_at = ? WHERE id = ?"
    ).run(reviveAt, characterId);

    const char = db
      .prepare("SELECT * FROM characters WHERE id = ?")
      .get(characterId) as CharacterRow;
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

  // SUCCESS
  const rewards = {
    xp: randomInt(mission.rewards.xpRange[0], mission.rewards.xpRange[1]),
    scrap: randomInt(mission.rewards.scrap[0], mission.rewards.scrap[1]),
    crystal: mission.rewards.crystal
      ? randomInt(mission.rewards.crystal[0], mission.rewards.crystal[1])
      : undefined,
    artifact: mission.rewards.artifact
      ? randomInt(mission.rewards.artifact[0], mission.rewards.artifact[1])
      : undefined,
  };

  // Apply XP and check level up
  const charRow = db
    .prepare("SELECT * FROM characters WHERE id = ?")
    .get(characterId) as CharacterRow;
  let newXp = charRow.xp + rewards.xp;
  let newLevel = charRow.level;
  while (newXp >= newLevel * XP_PER_LEVEL) {
    newXp -= newLevel * XP_PER_LEVEL;
    newLevel++;
  }

  db.prepare(
    "UPDATE characters SET state = 'idle', level = ?, xp = ?, revive_at = NULL WHERE id = ?"
  ).run(newLevel, newXp, characterId);

  // Add resources
  db.prepare(
    "UPDATE inventories SET scrap = scrap + ?, crystal = crystal + ?, artifact = artifact + ? WHERE character_id = ?"
  ).run(rewards.scrap, rewards.crystal ?? 0, rewards.artifact ?? 0, characterId);

  // Check NFT drop
  let nftDrop = null;
  if (
    mission.rewards.nftChance &&
    Math.random() * 100 < mission.rewards.nftChance
  ) {
    const nftId = randomUUID();
    const nftName = NFT_NAMES[randomInt(0, NFT_NAMES.length - 1)];
    db.prepare(
      "INSERT INTO nft_claims (id, character_id, mission_id, nft_name) VALUES (?, ?, ?, ?)"
    ).run(nftId, characterId, mission.id, nftName);
    nftDrop = {
      id: nftId,
      missionId: mission.id as MissionId,
      nftName,
      claimedAt: null,
    };
  }

  const updatedChar = db
    .prepare("SELECT * FROM characters WHERE id = ?")
    .get(characterId) as CharacterRow;
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
