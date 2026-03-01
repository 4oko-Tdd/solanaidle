import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import {
  getCollection,
  getInventoryCapacity,
  getWeeklyBuffs,
  sacrificeItem,
} from "../services/permanent-loot-service.js";
import { getWeekStart } from "../services/boss-service.js";

type Env = { Variables: { wallet: string } };

const app = new Hono<Env>();
app.use("*", authMiddleware);

// GET /collection
app.get("/", (c) => {
  const wallet = c.get("wallet");
  const rawItems = getCollection(wallet);
  const capacity = getInventoryCapacity(wallet);
  const weeklyBuffs = getWeeklyBuffs(wallet, getWeekStart());

  const items = rawItems.map((r) => ({
    id: r.id,
    itemId: r.item_id,
    itemName: r.item_name,
    perkType: r.perk_type,
    perkValue: r.perk_value,
    mintAddress: r.mint_address ?? undefined,
    droppedAt: r.dropped_at,
  }));

  return c.json({ items, capacity, weeklyBuffs });
});

// POST /collection/sacrifice
app.post("/sacrifice", async (c) => {
  const wallet = c.get("wallet");
  const { lootId } = await c.req.json();

  if (!lootId) {
    return c.json({ error: "MISSING_LOOT_ID", message: "lootId is required" }, 400);
  }

  const result = sacrificeItem(wallet, lootId);
  if (!result.success) {
    return c.json({ error: "SACRIFICE_FAILED", message: result.error }, 400);
  }

  // Return updated state
  const rawItems = getCollection(wallet);
  const capacity = getInventoryCapacity(wallet);
  const items = rawItems.map((r) => ({
    id: r.id,
    itemId: r.item_id,
    itemName: r.item_name,
    perkType: r.perk_type,
    perkValue: r.perk_value,
    mintAddress: r.mint_address ?? undefined,
    droppedAt: r.dropped_at,
  }));

  return c.json({ success: true, items, capacity });
});

export default app;
