import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
import { getUpgradeInfo, upgradeGear } from "../services/upgrade-service.js";

type Env = { Variables: { wallet: string } };

const upgrades = new Hono<Env>();
upgrades.use("*", authMiddleware);

upgrades.get("/", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char)
    return c.json(
      { error: "CHARACTER_NOT_FOUND", message: "No character found" },
      404
    );

  const info = getUpgradeInfo(char.id, char.gearLevel);
  return c.json(info);
});

upgrades.post("/gear", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char)
    return c.json(
      { error: "CHARACTER_NOT_FOUND", message: "No character found" },
      404
    );

  try {
    const result = upgradeGear(char.id, char.gearLevel);
    return c.json(result);
  } catch (e: any) {
    if (e.message === "MAX_GEAR_LEVEL") {
      return c.json(
        { error: "MAX_GEAR_LEVEL", message: "Already at maximum gear level" },
        400
      );
    }
    if (e.message === "INSUFFICIENT_RESOURCES") {
      return c.json(
        { error: "INSUFFICIENT_RESOURCES", message: "Not enough resources" },
        400
      );
    }
    throw e;
  }
});

export default upgrades;
