import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getActiveRun, startRun, getLeaderboard, getEndedRun, storeStartSignature, storeEndSignature, endRun, getWeekBounds } from "../services/run-service.js";
import { getRunEvents } from "../services/event-service.js";
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
  const body = await c.req.json<{ classId: string; signature?: string }>();
  const validClassIds: ClassId[] = ["scout", "guardian", "mystic"];
  if (!validClassIds.includes(body.classId as ClassId)) {
    return c.json({ error: "INVALID_INPUT", message: "Invalid class" }, 400);
  }
  try {
    const run = startRun(wallet, body.classId as ClassId);
    if (body.signature) {
      storeStartSignature(run.id, body.signature);
    }
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

// Get ended run for current week (for finalize screen)
runs.get("/ended", (c) => {
  const wallet = c.get("wallet");
  const run = getEndedRun(wallet);
  return c.json(run);
});

// Get events for a run
runs.get("/:id/events", (c) => {
  const runId = c.req.param("id");
  const events = getRunEvents(runId);
  return c.json(events);
});

// Finalize a run (seal score with wallet signature)
runs.post("/:id/finalize", async (c) => {
  const wallet = c.get("wallet");
  const runId = c.req.param("id");
  const body = await c.req.json<{ signature: string }>();

  const run = getActiveRun(wallet);
  if (!run && runId) {
    storeEndSignature(runId, body.signature);
    return c.json({ finalized: true });
  }
  if (run && run.id === runId) {
    endRun(runId);
    storeEndSignature(runId, body.signature);
    return c.json({ finalized: true });
  }
  return c.json({ error: "RUN_NOT_FOUND", message: "Run not found" }, 404);
});

// Get available classes
runs.get("/classes", (c) => {
  return c.json(CLASSES);
});

export default runs;
