import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getActiveRun, startRun, getLeaderboard } from "../services/run-service.js";
import { CLASSES } from "../services/game-config.js";
import type { ClassId } from "@solanaidle/shared";

type Env = { Variables: { wallet: string } };

const runs = new Hono<Env>();
runs.use("*", authMiddleware);

// Get current active run
runs.get("/current", (c) => {
  const wallet = c.get("wallet");
  const run = getActiveRun(wallet);
  return c.json(run);
});

// Start a new weekly run (pick class)
runs.post("/start", async (c) => {
  const wallet = c.get("wallet");
  const body = await c.req.json<{ classId: string }>();
  const validClassIds: ClassId[] = ["scout", "guardian", "mystic"];
  if (!validClassIds.includes(body.classId as ClassId)) {
    return c.json({ error: "INVALID_INPUT", message: "Invalid class" }, 400);
  }
  try {
    const run = startRun(wallet, body.classId as ClassId);
    return c.json(run, 201);
  } catch (e: any) {
    if (e.message === "CLASS_ALREADY_CHOSEN") {
      return c.json({ error: "CLASS_ALREADY_CHOSEN", message: "Already started a run this week" }, 409);
    }
    throw e;
  }
});

// Get leaderboard
runs.get("/leaderboard", (c) => {
  const leaderboard = getLeaderboard();
  return c.json(leaderboard);
});

// Get available classes
runs.get("/classes", (c) => {
  return c.json(CLASSES);
});

export default runs;
