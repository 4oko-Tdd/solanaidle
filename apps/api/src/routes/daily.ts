import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
import { getDailyStatus, claimDaily } from "../services/daily-service.js";

type Env = { Variables: { wallet: string } };

const daily = new Hono<Env>();
daily.use("*", authMiddleware);

daily.get("/status", (c) => {
  const wallet = c.get("wallet");
  const status = getDailyStatus(wallet);
  return c.json(status);
});

daily.post("/claim", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);
  }
  try {
    const result = claimDaily(wallet, char.id);
    return c.json(result);
  } catch (e: any) {
    if (e.message === "ALREADY_CLAIMED_TODAY") {
      return c.json({ error: "ALREADY_CLAIMED", message: "Already claimed today" }, 409);
    }
    throw e;
  }
});

export default daily;
