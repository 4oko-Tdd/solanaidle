import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import db from "../db/database.js";
import { getActiveRun, startRun, getLeaderboard, getEndedRun, storeStartSignature, storeEndSignature, endRun, getWeekBounds } from "../services/run-service.js";
import { batchResolve } from "../services/name-service.js";
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

    // Grant starter perk offer
    db.prepare("UPDATE weekly_runs SET bonus_perk_points = 1 WHERE wallet_address = ? AND active = 1")
      .run(wallet);

    // Initialize progress PDA and reset to zero (handles same-week re-runs in dev)
    const { weekStart } = getWeekBounds();
    const weekStartTs = Math.floor(new Date(weekStart).getTime() / 1000);
    initializeProgressOnChain(wallet, weekStartTs, body.classId)
      .then(() => updateProgressOnER(wallet, weekStartTs, 0, 0, 0, false, body.classId))
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
runs.get("/leaderboard", async (c) => {
  const leaderboard = getLeaderboard();
  const names = await batchResolve(leaderboard.map((e) => e.walletAddress));
  const enriched = leaderboard.map((e) =>
    names.has(e.walletAddress) ? { ...e, displayName: names.get(e.walletAddress) } : e
  );
  return c.json(enriched);
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

// Unlock the fast mission slot for this epoch (costs 20 SKR)
runs.post("/unlock-fast-slot", async (c) => {
  const wallet = c.get("wallet");
  const { paymentSignature } = await c.req
    .json<{ paymentSignature?: string }>()
    .catch(() => ({} as { paymentSignature?: string }));
  if (!paymentSignature?.trim()) {
    return c.json({ error: "PAYMENT_SIGNATURE_REQUIRED" }, 400);
  }

  const run = getActiveRun(wallet);
  if (!run) return c.json({ error: "NO_ACTIVE_RUN" }, 400);

  const row = db.prepare("SELECT fast_slot_unlocked FROM weekly_runs WHERE id = ?")
    .get(run.id) as { fast_slot_unlocked: number } | undefined;
  if (row?.fast_slot_unlocked) {
    return c.json({ error: "ALREADY_UNLOCKED", message: "Fast slot already unlocked this epoch" }, 409);
  }

  // Verify SKR payment
  const { verifyAndRecordSkrPayment } = await import("../services/skr-service.js");
  const { getWeekStart } = await import("../services/boss-service.js");
  const payment = await verifyAndRecordSkrPayment({
    signature: paymentSignature,
    walletAddress: wallet,
    amount: 20,
    action: "fast_slot",
    weekStart: getWeekStart(),
  });
  if (!payment.success) {
    return c.json({ error: "INVALID_SKR_PAYMENT", message: payment.error }, 400);
  }

  db.prepare("UPDATE weekly_runs SET fast_slot_unlocked = 1 WHERE id = ?").run(run.id);
  return c.json({ fastSlotUnlocked: true });
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
