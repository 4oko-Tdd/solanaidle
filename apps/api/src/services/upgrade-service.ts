import db from "../db/database.js";
import {
  ARMOR_UPGRADES, ENGINE_UPGRADES, SCANNER_UPGRADES,
  MAX_TRACK_LEVEL,
  getArmorReduction, getEngineReduction, getScannerBonus,
} from "./game-config.js";
import type { Inventory, UpgradeInfo, TrackInfo, GearTrack } from "@solanaidle/shared";

const TRACK_CONFIGS = {
  armor: {
    upgrades: ARMOR_UPGRADES,
    column: "armor_level",
    effectLabel: (level: number) => level > 0 ? `-${getArmorReduction(level)}% fail rate` : "No bonus",
    nextEffectLabel: (level: number) => `-${getArmorReduction(level)}% fail rate`,
  },
  engine: {
    upgrades: ENGINE_UPGRADES,
    column: "engine_level",
    effectLabel: (level: number) => level > 0 ? `-${Math.round(getEngineReduction(level) * 100)}% duration` : "No bonus",
    nextEffectLabel: (level: number) => `-${Math.round(getEngineReduction(level) * 100)}% duration`,
  },
  scanner: {
    upgrades: SCANNER_UPGRADES,
    column: "scanner_level",
    effectLabel: (level: number) => level > 0 ? `+${Math.round(getScannerBonus(level) * 100)}% loot` : "No bonus",
    nextEffectLabel: (level: number) => `+${Math.round(getScannerBonus(level) * 100)}% loot`,
  },
} as const;

function getTrackInfo(track: GearTrack, currentLevel: number, characterId: string): TrackInfo {
  const config = TRACK_CONFIGS[track];
  if (currentLevel >= MAX_TRACK_LEVEL) {
    return {
      level: currentLevel,
      maxLevel: MAX_TRACK_LEVEL,
      effectLabel: config.effectLabel(currentLevel),
      next: null,
    };
  }

  const nextUpgrade = config.upgrades.find(u => u.level === currentLevel + 1)!;
  const inv = db.prepare(
    "SELECT scrap, crystal, artifact FROM inventories WHERE character_id = ?"
  ).get(characterId) as Inventory;

  const canAfford =
    inv.scrap >= nextUpgrade.cost.scrap &&
    inv.crystal >= (nextUpgrade.cost.crystal ?? 0) &&
    inv.artifact >= (nextUpgrade.cost.artifact ?? 0);

  return {
    level: currentLevel,
    maxLevel: MAX_TRACK_LEVEL,
    effectLabel: config.effectLabel(currentLevel),
    next: {
      level: nextUpgrade.level,
      cost: nextUpgrade.cost,
      effectLabel: config.nextEffectLabel(nextUpgrade.level),
      canAfford,
    },
  };
}

export function getUpgradeInfo(characterId: string, runId: string): UpgradeInfo {
  const run = db.prepare(
    "SELECT armor_level, engine_level, scanner_level FROM weekly_runs WHERE id = ?"
  ).get(runId) as { armor_level: number; engine_level: number; scanner_level: number } | undefined;

  const armorLvl = run?.armor_level ?? 0;
  const engineLvl = run?.engine_level ?? 0;
  const scannerLvl = run?.scanner_level ?? 0;

  return {
    armor: getTrackInfo("armor", armorLvl, characterId),
    engine: getTrackInfo("engine", engineLvl, characterId),
    scanner: getTrackInfo("scanner", scannerLvl, characterId),
  };
}

export function upgradeTrack(
  characterId: string,
  runId: string,
  track: GearTrack
): { levels: { armor: number; engine: number; scanner: number }; inventory: Inventory } {
  const config = TRACK_CONFIGS[track];

  const run = db.prepare(
    `SELECT ${config.column} as level FROM weekly_runs WHERE id = ?`
  ).get(runId) as { level: number } | undefined;
  if (!run) throw new Error("RUN_NOT_FOUND");

  const currentLevel = run.level;
  if (currentLevel >= MAX_TRACK_LEVEL) throw new Error("MAX_LEVEL");

  const nextUpgrade = config.upgrades.find(u => u.level === currentLevel + 1)!;
  const inv = db.prepare(
    "SELECT scrap, crystal, artifact FROM inventories WHERE character_id = ?"
  ).get(characterId) as Inventory;

  const canAfford =
    inv.scrap >= nextUpgrade.cost.scrap &&
    inv.crystal >= (nextUpgrade.cost.crystal ?? 0) &&
    inv.artifact >= (nextUpgrade.cost.artifact ?? 0);
  if (!canAfford) throw new Error("INSUFFICIENT_RESOURCES");

  db.prepare(
    "UPDATE inventories SET scrap = scrap - ?, crystal = crystal - ?, artifact = artifact - ? WHERE character_id = ?"
  ).run(nextUpgrade.cost.scrap, nextUpgrade.cost.crystal ?? 0, nextUpgrade.cost.artifact ?? 0, characterId);

  db.prepare(
    `UPDATE weekly_runs SET ${config.column} = ? WHERE id = ?`
  ).run(currentLevel + 1, runId);

  const updatedRun = db.prepare(
    "SELECT armor_level, engine_level, scanner_level FROM weekly_runs WHERE id = ?"
  ).get(runId) as any;
  const updatedInv = db.prepare(
    "SELECT scrap, crystal, artifact FROM inventories WHERE character_id = ?"
  ).get(characterId) as Inventory;

  return {
    levels: {
      armor: updatedRun.armor_level,
      engine: updatedRun.engine_level,
      scanner: updatedRun.scanner_level,
    },
    inventory: updatedInv,
  };
}
