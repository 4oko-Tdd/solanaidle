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

  const inv = db
    .prepare(
      "SELECT scrap, crystal, artifact FROM inventories WHERE character_id = ?"
    )
    .get(char.id) as Inventory;
  return c.json(inv);
});

export default inventory;
