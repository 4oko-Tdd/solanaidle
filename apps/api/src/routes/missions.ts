import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
import {
  getActiveMission,
  startMission,
  claimMission,
} from "../services/mission-service.js";
import { MISSIONS } from "../services/game-config.js";

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

  const active = getActiveMission(char.id);
  return c.json({ activeMission: active });
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
  if (char.state === "on_mission") {
    return c.json(
      { error: "MISSION_IN_PROGRESS", message: "Already on a mission" },
      409
    );
  }
  if (char.state === "dead") {
    return c.json(
      { error: "CHARACTER_DEAD", message: "Character is dead" },
      409
    );
  }

  const { missionId } = await c.req.json();
  if (!["scout", "expedition", "deep_dive"].includes(missionId)) {
    return c.json(
      { error: "MISSION_IN_PROGRESS", message: "Invalid mission type" },
      400
    );
  }

  const activeMission = startMission(char.id, missionId);
  return c.json({ activeMission });
});

missions.post("/claim", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json(
      { error: "CHARACTER_NOT_FOUND", message: "No character found" },
      404
    );
  }
  if (char.state !== "on_mission") {
    return c.json(
      { error: "MISSION_NOT_COMPLETE", message: "No active mission" },
      400
    );
  }

  const active = getActiveMission(char.id);
  if (active && active.timeRemaining && active.timeRemaining > 0) {
    return c.json(
      { error: "MISSION_NOT_COMPLETE", message: "Mission still in progress" },
      400
    );
  }

  const result = claimMission(char.id, char.gearLevel);
  return c.json(result);
});

export default missions;
