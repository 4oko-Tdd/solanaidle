import db from "../db/database.js";
import { getGearUpgrade, MAX_GEAR_LEVEL } from "./game-config.js";
import type { Inventory, UpgradeInfo } from "@solanaidle/shared";

export function getUpgradeInfo(
  characterId: string,
  gearLevel: number
): UpgradeInfo {
  if (gearLevel >= MAX_GEAR_LEVEL) {
    return { currentGearLevel: gearLevel, nextUpgrade: null };
  }

  const next = getGearUpgrade(gearLevel + 1)!;
  const inv = db
    .prepare(
      "SELECT scrap, crystal, artifact FROM inventories WHERE character_id = ?"
    )
    .get(characterId) as Inventory;

  const canAfford =
    inv.scrap >= next.cost.scrap &&
    inv.crystal >= (next.cost.crystal ?? 0) &&
    inv.artifact >= (next.cost.artifact ?? 0);

  return {
    currentGearLevel: gearLevel,
    nextUpgrade: {
      level: next.level,
      cost: next.cost,
      failRateReduction: next.failRateReduction,
      canAfford,
    },
  };
}

export function upgradeGear(
  characterId: string,
  gearLevel: number
): { gearLevel: number; inventory: Inventory } {
  const info = getUpgradeInfo(characterId, gearLevel);
  if (!info.nextUpgrade) throw new Error("MAX_GEAR_LEVEL");
  if (!info.nextUpgrade.canAfford) throw new Error("INSUFFICIENT_RESOURCES");

  const cost = info.nextUpgrade.cost;

  db.prepare(
    "UPDATE inventories SET scrap = scrap - ?, crystal = crystal - ?, artifact = artifact - ? WHERE character_id = ?"
  ).run(cost.scrap, cost.crystal ?? 0, cost.artifact ?? 0, characterId);

  db.prepare("UPDATE characters SET gear_level = ? WHERE id = ?").run(
    info.nextUpgrade.level,
    characterId
  );

  const inv = db
    .prepare(
      "SELECT scrap, crystal, artifact FROM inventories WHERE character_id = ?"
    )
    .get(characterId) as Inventory;

  return { gearLevel: info.nextUpgrade.level, inventory: inv };
}
