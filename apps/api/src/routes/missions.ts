import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
import {
  getActiveMission,
  getActiveMissions,
  startMission,
  claimMission,
} from "../services/mission-service.js";
import { MISSIONS } from "../services/game-config.js";
import { getActiveRun } from "../services/run-service.js";
import db from "../db/database.js";

type Env = { Variables: { wallet: string } };

const missions = new Hono<Env>();
missions.use("*", authMiddleware);

missions.get("/", (c) => {
  return c.json(MISSIONS);
});

missions.get("/active", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json(
      { error: "CHARACTER_NOT_FOUND", message: "No character found" },
      404
    );
  }

  const missions = getActiveMissions(char.id);
  const run = getActiveRun(wallet);
  const fastSlotUnlocked = run
    ? (db.prepare("SELECT fast_slot_unlocked FROM weekly_runs WHERE id = ?")
        .get(run.id) as { fast_slot_unlocked: number } | undefined)?.fast_slot_unlocked === 1
    : false;
  // backward-compat: also expose activeMission (main slot)
  return c.json({ activeMission: missions.main, main: missions.main, fast: missions.fast, fastSlotUnlocked });
});

missions.post("/start", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json(
      { error: "CHARACTER_NOT_FOUND", message: "No character found" },
      404
    );
  }
  if (char.state === "dead") {
    return c.json(
      { error: "CHARACTER_DEAD", message: "Character is dead" },
      409
    );
  }

  const { missionId, rerollStacks, insured, slot = 'main' } = await c.req.json<{
    missionId: string;
    rerollStacks?: number;
    insured?: boolean;
    slot?: 'main' | 'fast';
  }>();
  if (!["scout", "expedition", "deep_dive"].includes(missionId)) {
    return c.json(
      { error: "INVALID_MISSION", message: "Invalid mission type" },
      400
    );
  }

  // For main slot, character must not already be on a mission
  if (slot === 'main' && char.state === "on_mission") {
    return c.json({ error: "MISSION_IN_PROGRESS", message: "Already on a mission" }, 409);
  }

  // Get run context if available
  const run = getActiveRun(wallet);
  try {
    const activeMission = startMission(char.id, missionId, run?.classId, char.level, run?.id, rerollStacks, insured, wallet, slot);
    return c.json({ activeMission });
  } catch (e: any) {
    if (e.message === "INSUFFICIENT_RESOURCES") {
      return c.json({ error: "INSUFFICIENT_RESOURCES", message: "Not enough resources" }, 400);
    }
    if (e.message === "Mission tier locked") {
      return c.json({ error: "MISSION_LOCKED", message: e.message }, 400);
    }
    if (e.message === "FAST_SLOT_SCOUT_ONLY") {
      return c.json({ error: "INVALID_MISSION", message: "Fast slot only supports scout missions" }, 400);
    }
    if (e.message === "FAST_SLOT_LOCKED") {
      return c.json({ error: "FAST_SLOT_LOCKED", message: "Fast slot not unlocked for this epoch" }, 400);
    }
    if (e.message === "MISSION_IN_PROGRESS") {
      return c.json({ error: "MISSION_IN_PROGRESS", message: "Fast slot already in use" }, 409);
    }
    throw e;
  }
});

missions.post("/claim", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json(
      { error: "CHARACTER_NOT_FOUND", message: "No character found" },
      404
    );
  }

  const body = await c.req
    .json<{ playerSignature?: string; slot?: 'main' | 'fast' }>()
    .catch(() => ({} as { playerSignature?: string; slot?: 'main' | 'fast' }));
  const slot = body.slot ?? 'main';

  // For main slot, character must be on_mission
  if (slot === 'main' && char.state !== "on_mission") {
    return c.json(
      { error: "MISSION_NOT_COMPLETE", message: "No active mission" },
      400
    );
  }

  // Check the relevant slot's active mission
  const active = slot === 'main'
    ? getActiveMission(char.id)
    : getActiveMissions(char.id).fast;
  if (!active) {
    return c.json(
      { error: "MISSION_NOT_COMPLETE", message: "No active mission in this slot" },
      400
    );
  }
  if ((active.timeRemaining ?? 0) > 0) {
    return c.json(
      { error: "MISSION_NOT_COMPLETE", message: "Mission still in progress" },
      400
    );
  }

  // playerSignature required only for main slot (on-chain record)
  const { playerSignature } = body;
  if (slot === 'main') {
    if (!playerSignature || !playerSignature.trim()) {
      return c.json(
        {
          error: "SIGNATURE_REQUIRED",
          message: "Mission claim requires wallet signature",
        },
        400
      );
    }
  }

  const run = getActiveRun(wallet);
  const result = await claimMission(char.id, run?.classId, run?.id, wallet, playerSignature, slot);
  return c.json(result);
});

export default missions;
