import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
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

  const inv: Inventory = {
    scrap: row.scrap,
    crystal: row.crystal,
    artifact: row.artifact,
  };

  db.prepare(
    "INSERT OR IGNORE INTO skr_wallets (wallet_address, balance) VALUES (?, 0)"
  ).run(wallet);
  const skrRow = db
    .prepare("SELECT balance FROM skr_wallets WHERE wallet_address = ?")
    .get(wallet) as { balance: number } | undefined;
  inv.skr = skrRow?.balance ?? 0;

  return c.json(inv);
});

export default inventory;
