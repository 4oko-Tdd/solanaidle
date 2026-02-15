import { randomUUID } from "crypto";
import db from "../db/database.js";
import {
  BOSS_DROP_CHANCES,
  WEEKLY_BUFF_DEFINITIONS,
  PERMANENT_LOOT_DEFINITIONS,
  INVENTORY_STARTING_SLOTS,
} from "./game-config.js";

// ── Types ──

export interface BossDropResult {
  weeklyBuff: { buffId: string; buffName: string } | null;
  permanentLoot: {
    itemId: string;
    itemName: string;
    perkType: string;
    perkValue: number;
  } | null;
  dataCore: boolean;
  nftArtifact: boolean;
  inventoryFull: boolean;
}

// ── Contribution multipliers per drop category ──

const CONTRIBUTION_MULTIPLIERS: Record<string, number> = {
  weekly_buff: 1,
  permanent_loot: 2,
  data_core: 1,
  nft_artifact: 3,
};

// ── Helpers ──

function getInventoryCapacity(walletAddress: string): {
  current: number;
  max: number;
} {
  const capRow = db
    .prepare("SELECT max_slots FROM inventory_capacity WHERE wallet_address = ?")
    .get(walletAddress) as { max_slots: number } | undefined;
  const max = capRow?.max_slots ?? INVENTORY_STARTING_SLOTS;

  const countRow = db
    .prepare(
      "SELECT COUNT(*) as cnt FROM permanent_loot WHERE wallet_address = ?"
    )
    .get(walletAddress) as { cnt: number };
  const current = countRow.cnt;

  return { current, max };
}

function rollChance(
  category: string,
  contributionPercent: number
): boolean {
  const baseChance =
    BOSS_DROP_CHANCES[category as keyof typeof BOSS_DROP_CHANCES];
  const multiplier = CONTRIBUTION_MULTIPLIERS[category] ?? 1;
  const finalChance = baseChance * (1 + contributionPercent * multiplier);
  return Math.random() < finalChance;
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Public API ──

/**
 * Roll boss drops for a player based on their contribution %.
 * Each category is rolled independently — a player can win multiple drops.
 */
export function rollBossDrops(
  walletAddress: string,
  contributionPercent: number
): BossDropResult {
  const result: BossDropResult = {
    weeklyBuff: null,
    permanentLoot: null,
    dataCore: false,
    nftArtifact: false,
    inventoryFull: false,
  };

  // Weekly buff roll
  if (rollChance("weekly_buff", contributionPercent)) {
    const buff = pickRandom(WEEKLY_BUFF_DEFINITIONS);
    result.weeklyBuff = { buffId: buff.id, buffName: buff.name };
  }

  // Permanent loot roll
  if (rollChance("permanent_loot", contributionPercent)) {
    const item = pickRandom(PERMANENT_LOOT_DEFINITIONS);
    const { current, max } = getInventoryCapacity(walletAddress);
    if (current >= max) {
      result.inventoryFull = true;
    }
    result.permanentLoot = {
      itemId: item.id,
      itemName: item.name,
      perkType: item.perkType,
      perkValue: item.perkValue,
    };
  }

  // Data core roll
  if (rollChance("data_core", contributionPercent)) {
    result.dataCore = true;
  }

  // NFT artifact roll
  if (rollChance("nft_artifact", contributionPercent)) {
    result.nftArtifact = true;
  }

  return result;
}

/**
 * Persist boss drops to the database.
 * - weekly_buff → weekly_buffs table
 * - permanent_loot → permanent_loot table (skipped if inventory full)
 * - data_core → increment inventory_capacity
 * - nft_artifact → flagged only (manual handling)
 */
export function applyDrops(
  walletAddress: string,
  drops: BossDropResult,
  weekStart: string
): void {
  // Weekly buff
  if (drops.weeklyBuff) {
    db.prepare(
      `INSERT INTO weekly_buffs (id, wallet_address, buff_id, buff_name, epoch_start, consumed)
       VALUES (?, ?, ?, ?, ?, 0)`
    ).run(
      randomUUID(),
      walletAddress,
      drops.weeklyBuff.buffId,
      drops.weeklyBuff.buffName,
      weekStart
    );
  }

  // Permanent loot (only if inventory has room)
  if (drops.permanentLoot && !drops.inventoryFull) {
    db.prepare(
      `INSERT INTO permanent_loot (id, wallet_address, item_id, item_name, perk_type, perk_value, mint_address, dropped_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`
    ).run(
      randomUUID(),
      walletAddress,
      drops.permanentLoot.itemId,
      drops.permanentLoot.itemName,
      drops.permanentLoot.perkType,
      drops.permanentLoot.perkValue,
      new Date().toISOString()
    );
  }

  // Data core → expand inventory
  if (drops.dataCore) {
    db.prepare(
      `INSERT INTO inventory_capacity (wallet_address, max_slots)
       VALUES (?, ? + 1)
       ON CONFLICT(wallet_address) DO UPDATE SET max_slots = max_slots + 1`
    ).run(walletAddress, INVENTORY_STARTING_SLOTS);
  }

  // nft_artifact is flagged in the BossDropResult for later manual / on-chain handling
}
