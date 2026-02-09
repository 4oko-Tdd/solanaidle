import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import {
  getCharacter,
  createCharacter,
} from "../services/character-service.js";

type Env = { Variables: { wallet: string } };

const character = new Hono<Env>();
character.use("*", authMiddleware);

character.get("/", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json(
      { error: "CHARACTER_NOT_FOUND", message: "No character found" },
      404
    );
  }
  return c.json(char);
});

character.post("/", (c) => {
  const wallet = c.get("wallet");
  const existing = getCharacter(wallet);
  if (existing) {
    return c.json(
      { error: "CHARACTER_EXISTS", message: "Character already exists" },
      409
    );
  }
  const char = createCharacter(wallet);
  return c.json(char, 201);
});

export default character;
