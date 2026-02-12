import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
import {
  getCharacterLoot,
  getLootBonus,
  getBaseDropChance,
  getMaxDropChance,
  sellLoot,
  mergeLoot,
  getSellPrice,
} from "../services/loot-service.js";
import db from "../db/database.js";
import type { Inventory } from "@solanaidle/shared";

type Env = { Variables: { wallet: string } };

const inventory = new Hono<Env>();
inventory.use("*", authMiddleware);

inventory.get("/", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char)
    return c.json(
      { error: "CHARACTER_NOT_FOUND", message: "No character found" },
      404
    );

  const row = db
    .prepare(
      "SELECT scrap, crystal, artifact FROM inventories WHERE character_id = ?"
    )
    .get(char.id) as { scrap: number; crystal: number; artifact: number } | undefined;
  if (!row) return c.json({ error: "INVENTORY_NOT_FOUND" }, 404);

  const loot = getCharacterLoot(char.id);
  const bonus = getLootBonus(char.id);
  const inv: Inventory = {
    ...row,
    loot,
    lootDropChancePercent: Math.min(getMaxDropChance(), getBaseDropChance() + bonus.dropChancePercent),
    lootSpeedPercent: bonus.speedPercent,
  };
  return c.json(inv);
});

inventory.get("/loot/prices", (c) => {
  const prices: Record<number, { scrap: number; crystal: number; artifact: number }> = {};
  for (const tier of [1, 2, 3]) {
    prices[tier] = getSellPrice(tier);
  }
  return c.json(prices);
});

inventory.post("/loot/sell", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);
  const body = await c.req.json<{ items: { itemId: string; quantity: number }[] }>();
  const items = body?.items ?? [];
  if (items.length === 0) return c.json({ error: "No items to sell" }, 400);
  try {
    sellLoot(char.id, items);
    const loot = getCharacterLoot(char.id);
    const row = db.prepare("SELECT scrap, crystal, artifact FROM inventories WHERE character_id = ?").get(char.id) as { scrap: number; crystal: number; artifact: number };
    return c.json({ inventory: { ...row, loot }, message: "Sold" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sell failed";
    return c.json({ error: "SELL_FAILED", message: msg }, 400);
  }
});

inventory.post("/loot/merge", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);
  const body = await c.req.json<{ items: { itemId: string; quantity: number }[] }>();
  const items = body?.items ?? [];
  try {
    mergeLoot(char.id, items);
    const loot = getCharacterLoot(char.id);
    const bonus = getLootBonus(char.id);
    const row = db.prepare("SELECT scrap, crystal, artifact FROM inventories WHERE character_id = ?").get(char.id) as { scrap: number; crystal: number; artifact: number };
    const inv: Inventory = { ...row, loot, lootDropChancePercent: Math.min(getMaxDropChance(), getBaseDropChance() + bonus.dropChancePercent), lootSpeedPercent: bonus.speedPercent };
    return c.json({ inventory: inv, message: "Merged 3× T1 → 1× T2" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Merge failed";
    return c.json({ error: "MERGE_FAILED", message: msg }, 400);
  }
});

export default inventory;
