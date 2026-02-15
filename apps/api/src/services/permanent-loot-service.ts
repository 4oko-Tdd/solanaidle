import db from "../db/database.js";
import {
  DIMINISHING_RETURNS,
  INVENTORY_STARTING_SLOTS,
} from "./game-config.js";

// ── Types ──

export interface PermanentLootItem {
  id: string;
  wallet_address: string;
  item_id: string;
  item_name: string;
  perk_type: string;
  perk_value: number;
  mint_address: string | null;
  dropped_at: string;
}

export interface WeeklyBuff {
  id: string;
  wallet_address: string;
  buff_id: string;
  buff_name: string;
  epoch_start: string;
  consumed: number;
}

// ── Public API ──

/** Get all permanent loot items for a wallet. */
export function getCollection(walletAddress: string): PermanentLootItem[] {
  return db
    .prepare("SELECT * FROM permanent_loot WHERE wallet_address = ?")
    .all(walletAddress) as PermanentLootItem[];
}

/** Get current inventory usage and max capacity. */
export function getInventoryCapacity(
  walletAddress: string
): { current: number; max: number } {
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

/**
 * Compute aggregated permanent bonuses for a wallet.
 * Applies diminishing returns: 1st copy = 100%, 2nd = 75%, 3rd = 50%.
 * Returns e.g. { loot_chance: 0.035, speed: -0.03, fail_rate: -0.02 }
 */
export function getPermanentBonuses(
  walletAddress: string
): Record<string, number> {
  const items = getCollection(walletAddress);

  // Group items by (item_id, perk_type, perk_value)
  const groups = new Map<
    string,
    { perkType: string; perkValue: number; count: number }
  >();

  for (const item of items) {
    const existing = groups.get(item.item_id);
    if (existing) {
      existing.count++;
    } else {
      groups.set(item.item_id, {
        perkType: item.perk_type,
        perkValue: item.perk_value,
        count: 1,
      });
    }
  }

  // Aggregate with diminishing returns
  const bonuses: Record<string, number> = {};

  for (const { perkType, perkValue, count } of groups.values()) {
    let total = 0;
    for (let i = 0; i < count && i < DIMINISHING_RETURNS.length; i++) {
      total += perkValue * DIMINISHING_RETURNS[i];
    }
    bonuses[perkType] = (bonuses[perkType] ?? 0) + total;
  }

  return bonuses;
}

/**
 * Sacrifice a permanent loot item to gain +1 inventory slot.
 * The item is deleted and inventory_capacity is incremented.
 */
export function sacrificeItem(
  walletAddress: string,
  lootId: string
): { success: boolean; error?: string } {
  const item = db
    .prepare(
      "SELECT id FROM permanent_loot WHERE id = ? AND wallet_address = ?"
    )
    .get(lootId, walletAddress) as { id: string } | undefined;

  if (!item) {
    return { success: false, error: "Item not found or not owned by wallet" };
  }

  db.prepare(
    "DELETE FROM permanent_loot WHERE id = ? AND wallet_address = ?"
  ).run(lootId, walletAddress);

  db.prepare(
    `INSERT INTO inventory_capacity (wallet_address, max_slots)
     VALUES (?, ? + 1)
     ON CONFLICT(wallet_address) DO UPDATE SET max_slots = max_slots + 1`
  ).run(walletAddress, INVENTORY_STARTING_SLOTS);

  return { success: true };
}

/** Get active (unconsumed) weekly buffs for a wallet in a given epoch. */
export function getWeeklyBuffs(
  walletAddress: string,
  epochStart: string
): WeeklyBuff[] {
  return db
    .prepare(
      "SELECT * FROM weekly_buffs WHERE wallet_address = ? AND epoch_start = ? AND consumed = 0"
    )
    .all(walletAddress, epochStart) as WeeklyBuff[];
}

/** Mark a weekly buff as consumed. */
export function consumeBuff(buffId: string): void {
  db.prepare("UPDATE weekly_buffs SET consumed = 1 WHERE id = ?").run(buffId);
}
