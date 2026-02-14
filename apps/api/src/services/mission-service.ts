import { randomUUID } from "crypto";
import db from "../db/database.js";
import {
  getMission,
  getArmorReduction,
  getEngineReduction,
  getScannerBonus,
  REVIVE_COOLDOWN_MS,
  xpForLevel,
  NFT_NAMES,
  getClass,
  BOSS_MISSION,
  BOSS_UNLOCK_LEVEL,
  TIER2_UNLOCK_LEVEL,
  TIER3_UNLOCK_LEVEL,
  getStreakMultiplier,
  REROLL_COST_PER_STACK,
  MAX_REROLL_STACKS,
  INSURANCE_COST,
  REROLL_REDUCTION_PER_STACK,
} from "./game-config.js";
import { addScore, addSkillPoints, incrementMissions, markBossDefeated, useLife, incrementStreak, resetStreak } from "./run-service.js";
import { hasSkill } from "./skill-service.js";
import { insertEvent } from "./event-service.js";
import { tryDropRandomLoot, getLootBonus, getBaseDropChance, getMaxDropChance } from "./loot-service.js";
import type { ActiveMission, MissionClaimResponse, MissionId, MissionRewards } from "@solanaidle/shared";
import { updateProgressOnER } from "./er-service.js";
import { getActiveBoostPercent } from "./quest-service.js";

interface MissionRow {
  id: string;
  character_id: string;
  mission_id: string;
  started_at: string;
  ends_at: string;
  reroll_stacks: number;
  insured: number;
}

interface CharacterRow {
  id: string;
  wallet_address: string;
  level: number;
  xp: number;
  hp: number;
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
  characterLevel?: number,
  runId?: string,
  rerollStacks?: number,
  insured?: boolean,
  walletAddress?: string
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
  if (missionId === "deep_dive" && characterLevel && characterLevel < TIER3_UNLOCK_LEVEL) {
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

  // Apply engine upgrade reduction
  if (runId) {
    const runRow = db.prepare("SELECT engine_level FROM weekly_runs WHERE id = ?").get(runId) as { engine_level: number } | undefined;
    const engineReduction = getEngineReduction(runRow?.engine_level ?? 0);
    if (engineReduction > 0) {
      duration = Math.floor(duration * (1 - engineReduction));
    }
    // Validator's Block Leader: -25% duration on all missions
    if (hasSkill(runId, "scout_leader")) {
      duration = Math.floor(duration * 0.75);
    }
  }

  // Apply loot speed bonus (owned loot reduces mission duration)
  const lootBonus = getLootBonus(characterId);
  if (lootBonus.speedPercent > 0) {
    duration = Math.max(1, Math.floor(duration * (1 - lootBonus.speedPercent / 100)));
  }

  // Apply quest speed boost
  if (walletAddress) {
    const speedBoost = getActiveBoostPercent(walletAddress, "speed");
    if (speedBoost > 0) {
      duration = Math.max(1, Math.floor(duration * (1 - speedBoost / 100)));
    }
  }

  // Validate and deduct reroll/insurance costs
  const stacks = Math.min(Math.max(rerollStacks ?? 0, 0), MAX_REROLL_STACKS);
  const useInsurance = insured ? 1 : 0;

  if (stacks > 0 || useInsurance) {
    const inv = db.prepare(
      "SELECT scrap, crystal FROM inventories WHERE character_id = ?"
    ).get(characterId) as { scrap: number; crystal: number };

    const scrapCost = stacks * REROLL_COST_PER_STACK;
    const crystalCost = useInsurance ? INSURANCE_COST : 0;
    if (inv.scrap < scrapCost) throw new Error("INSUFFICIENT_RESOURCES");
    if (inv.crystal < crystalCost) throw new Error("INSUFFICIENT_RESOURCES");

    if (scrapCost > 0 || crystalCost > 0) {
      db.prepare(
        "UPDATE inventories SET scrap = scrap - ?, crystal = crystal - ? WHERE character_id = ?"
      ).run(scrapCost, crystalCost, characterId);
    }
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + duration * 1000);

  const id = randomUUID();
  db.prepare(
    "INSERT INTO active_missions (id, character_id, mission_id, started_at, ends_at, reroll_stacks, insured) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, characterId, missionId, now.toISOString(), endsAt.toISOString(), stacks, useInsurance);

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
  classId?: string,
  runId?: string,
  walletAddress?: string
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
  // Read armor level from run
  let armorLevel = 0;
  if (runId) {
    const runRow = db.prepare("SELECT armor_level FROM weekly_runs WHERE id = ?").get(runId) as { armor_level: number } | undefined;
    armorLevel = runRow?.armor_level ?? 0;
  }
  const failReduction = getArmorReduction(armorLevel);
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
    // Guardian's Governance Vote: -5% fail on tier 3+ missions (deep_dive, boss)
    if (hasSkill(runId, "guardian_fortify") && (missionRow.mission_id === "deep_dive" || missionRow.mission_id === "boss")) {
      finalFailRate = Math.max(0, finalFailRate - 5);
    }
    // Guardian's Consensus Shield: -10% fail on ALL missions
    if (hasSkill(runId, "guardian_consensus")) {
      finalFailRate = Math.max(0, finalFailRate - 10);
    }
  }

  // Apply reroll stacks (-2% per stack)
  if (missionRow.reroll_stacks > 0) {
    finalFailRate = Math.max(0, finalFailRate - missionRow.reroll_stacks * REROLL_REDUCTION_PER_STACK);
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
        insertEvent(runId, "mission_fail", {
          missionId: missionRow.mission_id,
          livesRemaining: -1,
          escaped: true,
        });
        return {
          result: "success", // Treated as a narrow escape
          rewards: { xp: 0, scrap: 0 },
          nftDrop: null,
          character: mapCharacter(char),
          streak: 0,
        };
      }
      useLife(runId);
      // Insurance protects streak on failure
      if (!missionRow.insured) {
        resetStreak(runId);
      }
      const runAfterLife = db.prepare("SELECT lives_remaining FROM weekly_runs WHERE id = ?").get(runId) as any;
      const livesLeft = runAfterLife?.lives_remaining ?? 0;
      insertEvent(runId, "mission_fail", {
        missionId: missionRow.mission_id,
        livesRemaining: livesLeft,
        escaped: false,
      });
      if (livesLeft <= 0) {
        insertEvent(runId, "run_end", {
          finalScore: 0,
          cause: "death",
        });
      }
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
      streak: 0,
    };
  }

  // SUCCESS
  const rewards: MissionRewards = {
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

  // Apply quest XP boost
  if (walletAddress) {
    const xpBoost = getActiveBoostPercent(walletAddress, "xp");
    if (xpBoost > 0) {
      rewards.xp = Math.floor(rewards.xp * (1 + xpBoost / 100));
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

  // Apply scanner upgrade bonus to loot
  if (runId) {
    const runRow = db.prepare("SELECT scanner_level FROM weekly_runs WHERE id = ?").get(runId) as { scanner_level: number } | undefined;
    const scannerBonus = getScannerBonus(runRow?.scanner_level ?? 0);
    if (scannerBonus > 0) {
      rewards.scrap = Math.floor(rewards.scrap * (1 + scannerBonus));
      if (rewards.crystal) rewards.crystal = Math.floor(rewards.crystal * (1 + scannerBonus));
      if (rewards.artifact) rewards.artifact = Math.floor(rewards.artifact * (1 + scannerBonus));
    }
  }

  // Apply T4/T5 skill loot bonuses
  if (runId) {
    // Validator's MEV Boost: +20% lamports from Swap missions
    if (hasSkill(runId, "scout_mev") && missionRow.mission_id === "scout") {
      rewards.scrap = Math.floor(rewards.scrap * 1.2);
    }
    // Validator's Block Leader: -25% duration (applied at start, loot effect is passive)
    // Staker's Delegation: +15% tokens from Stake missions
    if (hasSkill(runId, "guardian_delegate") && missionRow.mission_id === "expedition") {
      if (rewards.crystal) rewards.crystal = Math.floor(rewards.crystal * 1.15);
    }
    // Oracle's Alpha Leak: +25% keys from Deep Farm
    if (hasSkill(runId, "mystic_alpha") && missionRow.mission_id === "deep_dive") {
      if (rewards.artifact) rewards.artifact = Math.floor(rewards.artifact * 1.25);
    }
  }

  // Apply streak multiplier to loot (not XP)
  let streakMultiplier = 1.0;
  let currentStreak = 0;
  if (runId) {
    const newStreak = incrementStreak(runId);
    currentStreak = newStreak;
    streakMultiplier = getStreakMultiplier(newStreak);
    if (streakMultiplier > 1.0) {
      rewards.scrap = Math.floor(rewards.scrap * streakMultiplier);
      if (rewards.crystal) rewards.crystal = Math.floor(rewards.crystal * streakMultiplier);
      if (rewards.artifact) rewards.artifact = Math.floor(rewards.artifact * streakMultiplier);
    }
    rewards.streakMultiplier = streakMultiplier;
  }

  // Apply XP and check level up
  const charRow = db
    .prepare("SELECT * FROM characters WHERE id = ?")
    .get(characterId) as CharacterRow;
  let newXp = charRow.xp + rewards.xp;
  let newLevel = charRow.level;
  while (newXp >= xpForLevel(newLevel)) {
    newXp -= xpForLevel(newLevel);
    newLevel++;
  }
  if (newLevel > charRow.level && runId) {
    const levelsGained = newLevel - charRow.level;
    addSkillPoints(runId, levelsGained);
    insertEvent(runId, "level_up", { newLevel, skillPointsAwarded: levelsGained });
  }

  db.prepare(
    "UPDATE characters SET state = 'idle', level = ?, xp = ?, revive_at = NULL WHERE id = ?"
  ).run(newLevel, newXp, characterId);

  // Add resources
  db.prepare(
    "UPDATE inventories SET scrap = scrap + ?, crystal = crystal + ?, artifact = artifact + ? WHERE character_id = ?"
  ).run(rewards.scrap, rewards.crystal ?? 0, rewards.artifact ?? 0, characterId);

  // Random loot drop on success (base 20% + loot bonus + quest boost, cap 55%)
  const lootBonus = getLootBonus(characterId);
  let lootChanceBoost = 0;
  if (walletAddress) {
    lootChanceBoost = getActiveBoostPercent(walletAddress, "loot_chance");
  }
  const effectiveDrop = Math.min(
    getMaxDropChance(),
    getBaseDropChance() + lootBonus.dropChancePercent + lootChanceBoost
  );
  tryDropRandomLoot(characterId, effectiveDrop);

  // Run-aware success handling
  if (runId) {
    addScore(runId, rewards.xp);
    incrementMissions(runId);

    // Boss-specific handling
    if (missionRow.mission_id === "boss") {
      markBossDefeated(runId);
      addSkillPoints(runId, 2); // bonus SP for boss kill
    }
    if (runId) {
      insertEvent(runId, "mission_success", {
        missionId: missionRow.mission_id,
        xp: rewards.xp,
        scrap: rewards.scrap,
        crystal: rewards.crystal ?? 0,
        artifact: rewards.artifact ?? 0,
      });
      if (missionRow.mission_id === "boss") {
        insertEvent(runId, "boss_kill", {
          xp: rewards.xp,
          scrap: rewards.scrap,
          crystal: rewards.crystal ?? 0,
          artifact: rewards.artifact ?? 0,
        });
      }
    }
  }

  // Update on-chain progress via Ephemeral Rollup (fire-and-forget)
  if (runId) {
    const runRow = db.prepare(
      "SELECT wallet_address, week_start, score, missions_completed, boss_defeated FROM weekly_runs WHERE id = ?"
    ).get(runId) as { wallet_address: string; week_start: string; score: number; missions_completed: number; boss_defeated: number } | undefined;
    if (runRow) {
      const deathCount = db.prepare(
        "SELECT COUNT(*) as cnt FROM run_events WHERE run_id = ? AND event_type = 'mission_fail'"
      ).get(runId) as { cnt: number };
      const weekStartTs = Math.floor(new Date(runRow.week_start).getTime() / 1000);
      updateProgressOnER(
        runRow.wallet_address,
        weekStartTs,
        runRow.score,
        runRow.missions_completed,
        deathCount?.cnt ?? 0,
        runRow.boss_defeated === 1
      ).catch(() => {}); // fire-and-forget
    }
  }

  // Check NFT drop
  let nftDrop = null;
  let nftChance = mission.rewards.nftChance ?? 0;
  if (runId && hasSkill(runId, "mystic_ritual") && missionRow.mission_id === "deep_dive") {
    nftChance += 15;
  }
  // Oracle Network: 2x NFT drop chance on all missions
  if (runId && hasSkill(runId, "mystic_network") && nftChance > 0) {
    nftChance *= 2;
  }
  if (nftChance > 0 && Math.random() * 100 < nftChance) {
    const nftId = randomUUID();
    const nftName = NFT_NAMES[randomInt(0, NFT_NAMES.length - 1)];
    db.prepare(
      "INSERT INTO nft_claims (id, character_id, mission_id, nft_name) VALUES (?, ?, ?, ?)"
    ).run(nftId, characterId, mission.id, nftName);
    if (runId) {
      insertEvent(runId, "nft_drop", { nftName, missionId: mission.id });
    }
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
    streak: currentStreak,
  };
}

function mapCharacter(char: CharacterRow) {
  return {
    id: char.id,
    walletAddress: char.wallet_address,
    level: char.level,
    xp: char.xp,
    hp: char.hp,
    state: char.state as "idle" | "on_mission" | "dead",
    reviveAt: char.revive_at,
  };
}
