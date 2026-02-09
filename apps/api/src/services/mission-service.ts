import { randomUUID } from "crypto";
import db from "../db/database.js";
import {
  getMission,
  getFailRateReduction,
  REVIVE_COOLDOWN_MS,
  XP_PER_LEVEL,
  NFT_NAMES,
  getClass,
  BOSS_MISSION,
  BOSS_UNLOCK_LEVEL,
  TIER2_UNLOCK_LEVEL,
} from "./game-config.js";
import { addScore, addSkillPoint, addSkillPoints, incrementMissions, markBossDefeated, useLife } from "./run-service.js";
import { hasSkill } from "./skill-service.js";
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
  missionId: string,
  classId?: string,
  characterLevel?: number
): ActiveMission {
  // Boss mission handling
  let mission;
  if (missionId === "boss") {
    mission = BOSS_MISSION;
    if (!characterLevel || characterLevel < BOSS_UNLOCK_LEVEL) throw new Error("BOSS_NOT_AVAILABLE");
  } else {
    mission = getMission(missionId);
  }
  if (!mission) throw new Error("Invalid mission");

  // Tier gating
  if (missionId === "expedition" && characterLevel && characterLevel < TIER2_UNLOCK_LEVEL) {
    throw new Error("Mission tier locked");
  }
  if (missionId === "deep_dive" && characterLevel && characterLevel < BOSS_UNLOCK_LEVEL) {
    throw new Error("Mission tier locked");
  }

  // Apply class duration modifier
  let duration = mission.duration;
  if (classId) {
    const charClass = getClass(classId);
    if (charClass) {
      duration = Math.floor(duration * charClass.durationModifier);
    }
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + duration * 1000);

  const id = randomUUID();
  db.prepare(
    "INSERT INTO active_missions (id, character_id, mission_id, started_at, ends_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, characterId, missionId, now.toISOString(), endsAt.toISOString());

  db.prepare("UPDATE characters SET state = 'on_mission' WHERE id = ?").run(
    characterId
  );

  return {
    missionId: mission.id as MissionId,
    startedAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

export function claimMission(
  characterId: string,
  gearLevel: number,
  classId?: string,
  runId?: string
): MissionClaimResponse {
  const missionRow = db
    .prepare("SELECT * FROM active_missions WHERE character_id = ?")
    .get(characterId) as MissionRow | undefined;
  if (!missionRow) throw new Error("No active mission");

  const endsAt = new Date(missionRow.ends_at).getTime();
  if (Date.now() < endsAt) throw new Error("Mission not complete");

  // Boss mission uses BOSS_MISSION constant; regular missions use getMission
  const mission = missionRow.mission_id === "boss"
    ? BOSS_MISSION
    : getMission(missionRow.mission_id)!;

  // Delete active mission
  db.prepare("DELETE FROM active_missions WHERE id = ?").run(missionRow.id);

  // Roll for success
  const failReduction = getFailRateReduction(gearLevel);
  const adjustedFailRate = Math.max(0, mission.failRate - failReduction);

  // Apply class fail rate modifier
  let finalFailRate = adjustedFailRate;
  if (classId) {
    const charClass = getClass(classId);
    if (charClass) {
      finalFailRate = Math.max(0, finalFailRate + charClass.failRateModifier);
    }
  }

  // Apply skill effects on fail rate
  if (runId) {
    // Guardian's Fortify: -5% fail on tier 3 missions (deep_dive, boss)
    if (hasSkill(runId, "guardian_fortify") && (missionRow.mission_id === "deep_dive" || missionRow.mission_id === "boss")) {
      finalFailRate = Math.max(0, finalFailRate - 5);
    }
  }

  const roll = Math.random() * 100;

  if (roll < finalFailRate) {
    // FAILURE

    // Run-aware failure handling
    if (runId) {
      // Check Lucky Escape skill (Scout) — 50% chance to survive, 1x per run
      if (hasSkill(runId, "scout_escape") && Math.random() < 0.5) {
        // Lucky escape! Don't die, don't lose a life
        db.prepare("UPDATE characters SET state = 'idle' WHERE id = ?").run(characterId);
        const char = db.prepare("SELECT * FROM characters WHERE id = ?").get(characterId) as CharacterRow;
        return {
          result: "success", // Treated as a narrow escape
          rewards: { xp: 0, scrap: 0 },
          nftDrop: null,
          character: mapCharacter(char),
        };
      }
      useLife(runId);
    }

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
      character: mapCharacter(char),
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

  // Apply class XP modifier
  if (classId) {
    const charClass = getClass(classId);
    if (charClass && charClass.xpModifier !== 1.0) {
      rewards.xp = Math.floor(rewards.xp * charClass.xpModifier);
    }
  }

  // Apply class loot modifier
  if (classId) {
    const charClass = getClass(classId);
    if (charClass && charClass.lootModifier !== 1.0) {
      rewards.scrap = Math.floor(rewards.scrap * charClass.lootModifier);
      if (rewards.crystal) rewards.crystal = Math.floor(rewards.crystal * charClass.lootModifier);
      if (rewards.artifact) rewards.artifact = Math.floor(rewards.artifact * charClass.lootModifier);
    }
  }

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

  // Run-aware success handling
  if (runId) {
    addScore(runId, rewards.xp);
    addSkillPoint(runId);
    incrementMissions(runId);

    // Boss-specific handling
    if (missionRow.mission_id === "boss") {
      markBossDefeated(runId);
      addSkillPoints(runId, 2); // bonus 3 total (1 + 2)
    }
  }

  // Check NFT drop
  let nftDrop = null;
  let nftChance = mission.rewards.nftChance ?? 0;
  if (runId && hasSkill(runId, "mystic_ritual") && missionRow.mission_id === "deep_dive") {
    nftChance += 15;
  }
  if (nftChance > 0 && Math.random() * 100 < nftChance) {
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
    character: mapCharacter(updatedChar),
  };
}

function mapCharacter(char: CharacterRow) {
  return {
    id: char.id,
    walletAddress: char.wallet_address,
    level: char.level,
    xp: char.xp,
    hp: char.hp,
    gearLevel: char.gear_level,
    state: char.state as "idle" | "on_mission" | "dead",
    reviveAt: char.revive_at,
  };
}
