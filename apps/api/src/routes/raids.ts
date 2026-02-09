import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getGuildByMember } from "../services/guild-service.js";
import {
  getAvailableRaids,
  getActiveRaid,
  startRaid,
  commitToRaid,
  claimRaid,
} from "../services/raid-service.js";

type Env = { Variables: { wallet: string } };

const raids = new Hono<Env>();
raids.use("*", authMiddleware);

// Get available raids for my guild
raids.get("/", (c) => {
  const wallet = c.get("wallet");
  const guild = getGuildByMember(wallet);
  if (!guild)
    return c.json(
      { error: "NOT_IN_GUILD", message: "Join a guild first" },
      400
    );
  const available = getAvailableRaids(guild.id);
  return c.json(available);
});

// Get active raid for my guild
raids.get("/active", (c) => {
  const wallet = c.get("wallet");
  const guild = getGuildByMember(wallet);
  if (!guild)
    return c.json(
      { error: "NOT_IN_GUILD", message: "Join a guild first" },
      400
    );
  const active = getActiveRaid(guild.id);
  return c.json(active);
});

// Start a new raid
raids.post("/start", async (c) => {
  const wallet = c.get("wallet");
  const guild = getGuildByMember(wallet);
  if (!guild)
    return c.json(
      { error: "NOT_IN_GUILD", message: "Join a guild first" },
      400
    );
  const body = await c.req.json<{ raidId: string }>();
  try {
    const raid = startRaid(guild.id, body.raidId, wallet);
    return c.json(raid, 201);
  } catch (e: any) {
    const errorMap: Record<string, [number, string]> = {
      RAID_IN_PROGRESS: [409, "A raid is already in progress"],
      RAID_NOT_READY: [400, "Not enough guild members for this raid"],
    };
    const mapped = errorMap[e.message];
    if (mapped)
      return c.json(
        { error: e.message, message: mapped[1] },
        mapped[0] as any
      );
    throw e;
  }
});

// Commit to active raid
raids.post("/commit", (c) => {
  const wallet = c.get("wallet");
  const guild = getGuildByMember(wallet);
  if (!guild)
    return c.json(
      { error: "NOT_IN_GUILD", message: "Join a guild first" },
      400
    );
  try {
    const raid = commitToRaid(guild.id, wallet);
    return c.json(raid);
  } catch (e: any) {
    if (e.message === "RAID_NOT_READY") {
      return c.json(
        { error: "RAID_NOT_READY", message: "No active raid to join" },
        400
      );
    }
    if (e.message === "RAID_IN_PROGRESS") {
      return c.json(
        { error: "RAID_IN_PROGRESS", message: "Already committed" },
        409
      );
    }
    throw e;
  }
});

// Claim raid rewards
raids.post("/claim", (c) => {
  const wallet = c.get("wallet");
  const guild = getGuildByMember(wallet);
  if (!guild)
    return c.json(
      { error: "NOT_IN_GUILD", message: "Join a guild first" },
      400
    );
  try {
    const result = claimRaid(guild.id, wallet);
    return c.json(result);
  } catch (e: any) {
    const errorMap: Record<string, [number, string]> = {
      RAID_NOT_READY: [400, "No completed raid to claim"],
      RAID_IN_PROGRESS: [400, "Raid is still in progress"],
      NOT_IN_GUILD: [400, "You did not participate in this raid"],
    };
    const mapped = errorMap[e.message];
    if (mapped)
      return c.json(
        { error: e.message, message: mapped[1] },
        mapped[0] as any
      );
    throw e;
  }
});

export default raids;
