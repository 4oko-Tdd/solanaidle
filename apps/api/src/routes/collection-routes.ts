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
  const items = getCollection(wallet);
  const capacity = getInventoryCapacity(wallet);
  const weeklyBuffs = getWeeklyBuffs(wallet, getWeekStart());

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
  const items = getCollection(wallet);
  const capacity = getInventoryCapacity(wallet);

  return c.json({ success: true, items, capacity });
});

export default app;
