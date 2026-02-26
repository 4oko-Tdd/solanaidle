import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getActiveRun, startRun, getLeaderboard, getEndedRun, storeStartSignature, storeEndSignature, endRun, getWeekBounds } from "../services/run-service.js";
import { getRunEvents } from "../services/event-service.js";
import { CLASSES } from "../services/game-config.js";
import { computeEpochBonus } from "../services/vrf-service.js";
import { getCharacter } from "../services/character-service.js";
import { getProgressPdaAddress, ER_CONSTANTS, initializeProgressOnChain, updateProgressOnER } from "../services/er-service.js";
import type { ClassId, EpochFinalizeResponse } from "@solanaidle/shared";

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
  if (!body.signature || !body.signature.trim() || body.signature === "unsigned") {
    return c.json(
      { error: "SIGNATURE_REQUIRED", message: "Run start requires wallet signature" },
      400
    );
  }
  try {
    const run = startRun(wallet, body.classId as ClassId);
    storeStartSignature(run.id, body.signature);

    // Initialize progress PDA and reset to zero (handles same-week re-runs in dev)
    const { weekStart } = getWeekBounds();
    const weekStartTs = Math.floor(new Date(weekStart).getTime() / 1000);
    initializeProgressOnChain(wallet, weekStartTs, body.classId)
      .then(() => updateProgressOnER(wallet, weekStartTs, 0, 0, 0, false))
      .catch((err) => {
        console.warn("[ER] Background progress init failed:", err);
      });

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

// Finalize a run (seal score with wallet signature + optional VRF bonus)
runs.post("/:id/finalize", async (c) => {
  const wallet = c.get("wallet");
  const runId = c.req.param("id");
  const body = await c.req.json<{ signature: string; vrfAccount?: string }>();
  if (!body.signature || !body.signature.trim() || body.signature === "unsigned") {
    return c.json(
      { error: "SIGNATURE_REQUIRED", message: "Run finalization requires wallet signature" },
      400
    );
  }

  // End the run if still active
  const run = getActiveRun(wallet);
  if (run && run.id === runId) {
    endRun(runId);
  } else if (!run && !runId) {
    return c.json({ error: "RUN_NOT_FOUND", message: "Run not found" }, 404);
  }

  storeEndSignature(runId, body.signature);

  // Compute VRF-powered epoch bonus rewards
  const char = getCharacter(wallet);
  const endedRun = getEndedRun(wallet);
  const bonus = await computeEpochBonus(
    wallet,
    char?.id ?? null,
    endedRun,
    body.vrfAccount ?? null
  );

  const response: EpochFinalizeResponse = {
    finalized: true,
    bonus,
  };

  return c.json(response);
});

// Get available classes
runs.get("/classes", (c) => {
  return c.json(CLASSES);
});

// Get ER constants and progress PDA for the current epoch
runs.get("/er-info", (c) => {
  const wallet = c.get("wallet");
  const { weekStart } = getWeekBounds();
  const weekStartTs = Math.floor(new Date(weekStart).getTime() / 1000);
  const progressPda = getProgressPdaAddress(wallet, weekStartTs);
  return c.json({
    ...ER_CONSTANTS,
    progressPda,
    weekStartTs,
  });
});

export default runs;
