import db from "../db/database.js";
import type { LootEntry } from "@solanaidle/shared";

const BASE_DROP_CHANCE = 20; // 20% base chance per mission success
const MAX_DROP_CHANCE = 55;

/** Per-tier perks: [dropChance%, speed%] */
const TIER_PERKS: Record<number, [number, number]> = {
  1: [5, 1],   // +5% drop, -1% duration
  2: [10, 2], // +10% drop, -2% duration
  3: [15, 3], // +15% drop, -3% duration
};

/** 5 items: hardware/Solana theme, tier 1/2/3 */
const DEFAULT_LOOT_ITEMS = [
  { id: "ram_stick", name: "RAM Stick", image_path: null, tier: 1 },
  { id: "lan_cable", name: "LAN Cable", image_path: null, tier: 1 },
  { id: "nvme_fragment", name: "NVMe Fragment", image_path: null, tier: 2 },
  { id: "cooling_fan", name: "Cooling Fan", image_path: null, tier: 2 },
  { id: "validator_key_shard", name: "Validator Key Shard", image_path: null, tier: 3 },
];

/** Sell price per 1 item (≈ 1 mission for tier 1) */
const SELL_PRICES: Record<number, { scrap: number; crystal?: number; artifact?: number }> = {
  1: { scrap: 10 },
  2: { scrap: 35, crystal: 5 },
  3: { scrap: 100, crystal: 20, artifact: 1 },
};

const MERGE_TIER1_COUNT = 3;
const TIER2_ITEM_IDS = DEFAULT_LOOT_ITEMS.filter((i) => i.tier === 2).map((i) => i.id);

export function seedLootItems(): void {
  const existing = db.prepare("SELECT id FROM loot_items LIMIT 1").get() as { id: string } | undefined;
  if (existing) {
    const current = db.prepare("SELECT id FROM loot_items").all() as { id: string }[];
    const oldIds = ["rusty_cog", "data_shard", "stale_token", "broken_lens", "warp_cell", "ghost_sig", "scrap_core", "dust_vial",
      "psu_capacitor", "network_card", "heat_sink", "rpc_chip", "staking_token_fragment"];
    const hasOld = current.some((r) => oldIds.includes(r.id));
    const hasNoTier = current.length > 0 && (db.prepare("PRAGMA table_info(loot_items)").all() as { name: string }[]).every((c) => c.name !== "tier");
    if (!hasOld && !hasNoTier) return;
    db.prepare("DELETE FROM character_loot").run();
    db.prepare("DELETE FROM loot_items").run();
  }
  const insert = db.prepare(
    "INSERT OR IGNORE INTO loot_items (id, name, image_path, tier) VALUES (?, ?, ?, ?)"
  );
  for (const item of DEFAULT_LOOT_ITEMS) {
    insert.run(item.id, item.name, item.image_path, item.tier);
  }
}

export interface LootBonus {
  dropChancePercent: number;
  speedPercent: number;
}

export function getLootBonus(characterId: string): LootBonus {
  const rows = db
    .prepare(
      `SELECT li.tier, cl.quantity
       FROM character_loot cl
       JOIN loot_items li ON li.id = cl.item_id
       WHERE cl.character_id = ?`
    )
    .all(characterId) as { tier: number; quantity: number }[];
  let dropChancePercent = 0;
  let speedPercent = 0;
  for (const r of rows) {
    const [drop, speed] = TIER_PERKS[r.tier] ?? [0, 0];
    dropChancePercent += drop * r.quantity;
    speedPercent += speed * r.quantity;
  }
  return { dropChancePercent, speedPercent };
}

export function getCharacterLoot(characterId: string): LootEntry[] {
  const rows = db
    .prepare(
      `SELECT cl.item_id, cl.quantity, li.name, li.image_path, li.tier
       FROM character_loot cl
       JOIN loot_items li ON li.id = cl.item_id
       WHERE cl.character_id = ?
       ORDER BY li.tier DESC, li.name`
    )
    .all(characterId) as { item_id: string; quantity: number; name: string; image_path: string | null; tier: number }[];
  return rows.map((r) => ({
    itemId: r.item_id,
    name: r.name,
    imageUrl: r.image_path ?? undefined,
    quantity: r.quantity,
    tier: r.tier,
  }));
}

export function addLoot(
  characterId: string,
  itemId: string,
  quantity: number = 1
): void {
  db.prepare(
    `INSERT INTO character_loot (character_id, item_id, quantity)
     VALUES (?, ?, ?)
     ON CONFLICT(character_id, item_id) DO UPDATE SET quantity = quantity + ?`
  ).run(characterId, itemId, quantity, quantity);
}

export function getRandomLootItemId(): string {
  const items = db
    .prepare("SELECT id FROM loot_items")
    .all() as { id: string }[];
  if (items.length === 0) return "";
  return items[Math.floor(Math.random() * items.length)].id;
}

export function getRandomTier2ItemId(): string {
  if (TIER2_ITEM_IDS.length === 0) return "";
  return TIER2_ITEM_IDS[Math.floor(Math.random() * TIER2_ITEM_IDS.length)];
}

export function getItemTier(itemId: string): number {
  const row = db.prepare("SELECT tier FROM loot_items WHERE id = ?").get(itemId) as { tier: number } | undefined;
  return row?.tier ?? 0;
}

export function getSellPrice(tier: number): { scrap: number; crystal: number; artifact: number } {
  const p = SELL_PRICES[tier];
  if (!p) return { scrap: 0, crystal: 0, artifact: 0 };
  return { scrap: p.scrap, crystal: p.crystal ?? 0, artifact: p.artifact ?? 0 };
}

export interface SellItem {
  itemId: string;
  quantity: number;
}

export function sellLoot(characterId: string, items: SellItem[]): void {
  if (items.length === 0) return;
  let totalScrap = 0;
  let totalCrystal = 0;
  let totalArtifact = 0;
  for (const { itemId, quantity } of items) {
    if (quantity <= 0) continue;
    const tier = getItemTier(itemId);
    if (tier === 0) throw new Error("Invalid item");
    const price = getSellPrice(tier);
    const row = db.prepare("SELECT quantity FROM character_loot WHERE character_id = ? AND item_id = ?").get(characterId, itemId) as { quantity: number } | undefined;
    if (!row || row.quantity < quantity) throw new Error("Not enough loot");
    totalScrap += price.scrap * quantity;
    totalCrystal += price.crystal * quantity;
    totalArtifact += price.artifact * quantity;
    const newQty = row.quantity - quantity;
    if (newQty <= 0) {
      db.prepare("DELETE FROM character_loot WHERE character_id = ? AND item_id = ?").run(characterId, itemId);
    } else {
      db.prepare("UPDATE character_loot SET quantity = ? WHERE character_id = ? AND item_id = ?").run(newQty, characterId, itemId);
    }
  }
  if (totalScrap > 0 || totalCrystal > 0 || totalArtifact > 0) {
    db.prepare(
      "UPDATE inventories SET scrap = scrap + ?, crystal = crystal + ?, artifact = artifact + ? WHERE character_id = ?"
    ).run(totalScrap, totalCrystal, totalArtifact, characterId);
  }
}

export function mergeLoot(characterId: string, items: SellItem[]): void {
  const total = items.reduce((s, i) => s + i.quantity, 0);
  if (total !== MERGE_TIER1_COUNT) throw new Error("Merge requires exactly 3 tier-1 items");
  for (const { itemId, quantity } of items) {
    if (quantity <= 0) continue;
    if (getItemTier(itemId) !== 1) throw new Error("Only tier-1 items can be merged");
    const row = db.prepare("SELECT quantity FROM character_loot WHERE character_id = ? AND item_id = ?").get(characterId, itemId) as { quantity: number } | undefined;
    if (!row || row.quantity < quantity) throw new Error("Not enough loot");
    const newQty = row.quantity - quantity;
    if (newQty <= 0) {
      db.prepare("DELETE FROM character_loot WHERE character_id = ? AND item_id = ?").run(characterId, itemId);
    } else {
      db.prepare("UPDATE character_loot SET quantity = ? WHERE character_id = ? AND item_id = ?").run(newQty, characterId, itemId);
    }
  }
  const tier2Id = getRandomTier2ItemId();
  if (tier2Id) addLoot(characterId, tier2Id, 1);
}

/** effectiveDropChancePercent: 0–100. Uses BASE_DROP_CHANCE if not provided. */
export function tryDropRandomLoot(characterId: string, effectiveDropChancePercent?: number): void {
  const chance = effectiveDropChancePercent ?? BASE_DROP_CHANCE;
  if (Math.random() * 100 >= chance) return;
  const itemId = getRandomLootItemId();
  if (itemId) addLoot(characterId, itemId, 1);
}

export function getBaseDropChance(): number {
  return BASE_DROP_CHANCE;
}

export function getMaxDropChance(): number {
  return MAX_DROP_CHANCE;
}
