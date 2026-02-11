import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
import { getUpgradeInfo, upgradeTrack } from "../services/upgrade-service.js";
import { getActiveRun } from "../services/run-service.js";
import type { GearTrack } from "@solanaidle/shared";

type Env = { Variables: { wallet: string } };

const upgrades = new Hono<Env>();
upgrades.use("*", authMiddleware);

const VALID_TRACKS: GearTrack[] = ["armor", "engine", "scanner"];

upgrades.get("/", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND" }, 404);

  const run = getActiveRun(wallet);
  if (!run) {
    return c.json({
      armor: { level: 0, maxLevel: 5, effectLabel: "No bonus", next: null },
      engine: { level: 0, maxLevel: 5, effectLabel: "No bonus", next: null },
      scanner: { level: 0, maxLevel: 5, effectLabel: "No bonus", next: null },
    });
  }

  const info = getUpgradeInfo(char.id, run.id);
  return c.json(info);
});

upgrades.post("/:track", (c) => {
  const wallet = c.get("wallet");
  const track = c.req.param("track") as GearTrack;
  if (!VALID_TRACKS.includes(track)) {
    return c.json({ error: "INVALID_TRACK", message: "Track must be armor, engine, or scanner" }, 400);
  }

  const char = getCharacter(wallet);
  if (!char) return c.json({ error: "CHARACTER_NOT_FOUND" }, 404);

  const run = getActiveRun(wallet);
  if (!run) return c.json({ error: "NO_ACTIVE_RUN", message: "No active weekly run" }, 400);

  try {
    const result = upgradeTrack(char.id, run.id, track);
    return c.json(result);
  } catch (e: any) {
    if (e.message === "MAX_LEVEL") return c.json({ error: "MAX_LEVEL", message: "Already at max level" }, 400);
    if (e.message === "INSUFFICIENT_RESOURCES") return c.json({ error: "INSUFFICIENT_RESOURCES", message: "Not enough resources" }, 400);
    throw e;
  }
});

export default upgrades;
