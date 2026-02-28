import { randomUUID } from "crypto";
import db from "../db/database.js";
import {
  getMission,
  getArmorReduction,
  getEngineReduction,
  getScannerBonus,
  REVIVE_COOLDOWN_MS,
  xpForLevel,
  getClass,
  TIER2_UNLOCK_LEVEL,
  TIER3_UNLOCK_LEVEL,
  getStreakMultiplier,
  REROLL_COST_PER_STACK,
  MAX_REROLL_STACKS,
  INSURANCE_COST,
  REROLL_REDUCTION_PER_STACK,
} from "./game-config.js";
import { addScore, incrementMissions, useLife, incrementStreak, resetStreak } from "./run-service.js";
import { insertEvent } from "./event-service.js";
import type { ActiveMission, MissionClaimResponse, MissionId, MissionRewards } from "@solanaidle/shared";
import { updateProgressOnER } from "./er-service.js";
import { checkAndGrantAchievements } from "./achievement-service.js";
import { trackChallengeProgress } from "./challenge-service.js";

interface MissionRow {
  id: string;
  character_id: string;
  mission_id: string;
  started_at: string;
  ends_at: string;
  reroll_stacks: number;
  insured: number;
  run_id: string | null;
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

export function getActiveMissions(characterId: string): { main: ActiveMission | null; fast: ActiveMission | null } {
  const rows = db.prepare("SELECT * FROM active_missions WHERE character_id = ?")
    .all(characterId) as MissionRow[];
  const toActive = (row: MissionRow | undefined): ActiveMission | null => {
    if (!row) return null;
    const now = Date.now();
    const endsAt = new Date(row.ends_at).getTime();
    return {
      missionId: row.mission_id as MissionId,
      startedAt: row.started_at,
      endsAt: row.ends_at,
      timeRemaining: Math.max(0, Math.floor((endsAt - now) / 1000)),
    };
  };
  return {
    main: toActive(rows.find(r => (r as any).slot === 'main')),
    fast: toActive(rows.find(r => (r as any).slot === 'fast')),
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
  walletAddress?: string,
  slot: 'main' | 'fast' = 'main'
): ActiveMission {
  const mission = getMission(missionId);
  if (!mission) throw new Error("Invalid mission");

  // Fast slot validation
  if (slot === 'fast') {
    if (missionId !== 'scout') throw new Error("FAST_SLOT_SCOUT_ONLY");
    if (runId) {
      const runRow = db.prepare("SELECT fast_slot_unlocked FROM weekly_runs WHERE id = ?").get(runId) as { fast_slot_unlocked: number } | undefined;
      if (!runRow || runRow.fast_slot_unlocked !== 1) throw new Error("FAST_SLOT_LOCKED");
    } else {
      throw new Error("FAST_SLOT_LOCKED");
    }
    const existingFast = db.prepare("SELECT id FROM active_missions WHERE character_id = ? AND slot = 'fast'").get(characterId);
    if (existingFast) throw new Error("MISSION_IN_PROGRESS");
  }

  // Tier gating (main slot only)
  if (slot === 'main') {
    if (missionId === "expedition" && characterLevel && characterLevel < TIER2_UNLOCK_LEVEL) {
      throw new Error("Mission tier locked");
    }
    if (missionId === "deep_dive" && characterLevel && characterLevel < TIER3_UNLOCK_LEVEL) {
      throw new Error("Mission tier locked");
    }
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
  }

  // Validate and deduct reroll/insurance costs (main slot only)
  const stacks = slot === 'main' ? Math.min(Math.max(rerollStacks ?? 0, 0), MAX_REROLL_STACKS) : 0;
  const useInsurance = slot === 'main' && insured ? 1 : 0;

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
    "INSERT INTO active_missions (id, character_id, mission_id, started_at, ends_at, reroll_stacks, insured, run_id, slot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, characterId, missionId, now.toISOString(), endsAt.toISOString(), stacks, useInsurance, runId ?? null, slot);

  // Only set character state to 'on_mission' for main slot
  if (slot === 'main') {
    db.prepare("UPDATE characters SET state = 'on_mission' WHERE id = ?").run(characterId);
  }

  return {
    missionId: mission.id as MissionId,
    startedAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

export async function claimMission(
  characterId: string,
  classId?: string,
  runId?: string,
  walletAddress?: string,
  playerSignature?: string,
  slot: 'main' | 'fast' = 'main'
): Promise<MissionClaimResponse> {
  const missionRow = db
    .prepare("SELECT * FROM active_missions WHERE character_id = ? AND slot = ?")
    .get(characterId, slot) as MissionRow | undefined;
  if (!missionRow) throw new Error("No active mission");

  const endsAt = new Date(missionRow.ends_at).getTime();
  if (Date.now() < endsAt) throw new Error("Mission not complete");

  // If the caller didn't supply a runId (e.g. epoch rolled over before claim),
  // fall back to the run that was active when the mission started.
  if (!runId && missionRow.run_id) {
    const storedRun = db
      .prepare("SELECT id, class_id FROM weekly_runs WHERE id = ?")
      .get(missionRow.run_id) as { id: string; class_id: string } | undefined;
    if (storedRun) {
      runId = storedRun.id;
      classId = storedRun.class_id;
    }
  }

  const mission = getMission(missionRow.mission_id)!;

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

  // Apply reroll stacks (-2% per stack)
  if (missionRow.reroll_stacks > 0) {
    finalFailRate = Math.max(0, finalFailRate - missionRow.reroll_stacks * REROLL_REDUCTION_PER_STACK);
  }

  const roll = Math.random() * 100;

  if (roll < finalFailRate) {
    // FAILURE

    if (slot === 'main') {
      // Run-aware failure handling (main slot only)
      if (runId) {
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
    }
    // Fast slot failure: no life loss, no state change — just lose the mission

    const char = db
      .prepare("SELECT * FROM characters WHERE id = ?")
      .get(characterId) as CharacterRow;
    return {
      result: "failure",
      rewards: null,
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

  // Apply class loot modifier to resources
  if (classId) {
    const charClass = getClass(classId);
    if (charClass && charClass.lootModifier !== 1.0) {
      rewards.scrap = Math.floor(rewards.scrap * charClass.lootModifier);
      if (rewards.crystal) rewards.crystal = Math.floor(rewards.crystal * charClass.lootModifier);
      if (rewards.artifact) rewards.artifact = Math.floor(rewards.artifact * charClass.lootModifier);
    }
  }

  // Apply scanner upgrade bonus to resources
  if (runId) {
    const runRow = db.prepare("SELECT scanner_level FROM weekly_runs WHERE id = ?").get(runId) as { scanner_level: number } | undefined;
    const scannerBonus = getScannerBonus(runRow?.scanner_level ?? 0);
    if (scannerBonus > 0) {
      rewards.scrap = Math.floor(rewards.scrap * (1 + scannerBonus));
      if (rewards.crystal) rewards.crystal = Math.floor(rewards.crystal * (1 + scannerBonus));
      if (rewards.artifact) rewards.artifact = Math.floor(rewards.artifact * (1 + scannerBonus));
    }
  }

  // Apply streak multiplier to resources (not XP)
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

  if (slot === 'main') {
    db.prepare(
      "UPDATE characters SET state = 'idle', level = ?, xp = ?, revive_at = NULL WHERE id = ?"
    ).run(newLevel, newXp, characterId);
  } else {
    db.prepare(
      "UPDATE characters SET level = ?, xp = ? WHERE id = ?"
    ).run(newLevel, newXp, characterId);
  }

  // Add resources
  db.prepare(
    "UPDATE inventories SET scrap = scrap + ?, crystal = crystal + ?, artifact = artifact + ? WHERE character_id = ?"
  ).run(rewards.scrap, rewards.crystal ?? 0, rewards.artifact ?? 0, characterId);

  // Run-aware success handling
  if (runId) {
    addScore(runId, rewards.xp);
    incrementMissions(runId);

    insertEvent(runId, "mission_success", {
      missionId: missionRow.mission_id,
      xp: rewards.xp,
      scrap: rewards.scrap,
      crystal: rewards.crystal ?? 0,
      artifact: rewards.artifact ?? 0,
      playerSignature: playerSignature ?? null,
    });

    // Achievement: Streak Legend + Deep Explorer
    if (walletAddress) {
      checkAndGrantAchievements(walletAddress, characterId, "mission_success", {
        streak: currentStreak,
      }).catch(() => {});
    }
  }

  // Track challenge progress
  if (walletAddress) {
    try {
      trackChallengeProgress(walletAddress, "missions", 1, characterId);
      trackChallengeProgress(walletAddress, "scrap", rewards.scrap, characterId);
      if (rewards.crystal) trackChallengeProgress(walletAddress, "crystal", rewards.crystal, characterId);
      // Track liquidity_run challenges separately (expedition = Liquidity Run)
      if (missionRow.mission_id === "expedition") {
        trackChallengeProgress(walletAddress, "liquidity_run", 1, characterId);
      }
    } catch {}
  }

  // Update on-chain progress via ER (server-side, fire-and-forget)
  if (runId) {
    const runRow = db.prepare(
      "SELECT wallet_address, week_start, score, missions_completed, boss_defeated, class_id FROM weekly_runs WHERE id = ?"
    ).get(runId) as { wallet_address: string; week_start: string; score: number; missions_completed: number; boss_defeated: number; class_id: string } | undefined;
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
        runRow.boss_defeated === 1,
        runRow.class_id
      ).catch(() => {});
    }
  }

  const updatedChar = db
    .prepare("SELECT * FROM characters WHERE id = ?")
    .get(characterId) as CharacterRow;
  return {
    result: "success",
    rewards,
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
