import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import {
  createGuild,
  joinGuild,
  leaveGuild,
  getGuildByMember,
  getGuildMembers,
} from "../services/guild-service.js";

type Env = { Variables: { wallet: string } };

const guilds = new Hono<Env>();
guilds.use("*", authMiddleware);

// Get my guild (with members)
guilds.get("/mine", (c) => {
  const wallet = c.get("wallet");
  const guild = getGuildByMember(wallet);
  if (!guild) return c.json({ guild: null, members: [] });
  const members = getGuildMembers(guild.id);
  return c.json({ guild, members });
});

// Create a guild
guilds.post("/", async (c) => {
  const wallet = c.get("wallet");
  const body = await c.req.json<{ name: string }>();
  if (!body.name || body.name.trim().length < 2) {
    return c.json(
      {
        error: "INVALID_INPUT",
        message: "Guild name must be at least 2 characters",
      },
      400
    );
  }
  try {
    const guild = createGuild(wallet, body.name.trim());
    return c.json(guild, 201);
  } catch (e: any) {
    if (e.message === "ALREADY_IN_GUILD") {
      return c.json(
        { error: "ALREADY_IN_GUILD", message: "You are already in a guild" },
        409
      );
    }
    if (e.message?.includes("UNIQUE constraint")) {
      return c.json(
        { error: "INVALID_INPUT", message: "Guild name already taken" },
        409
      );
    }
    throw e;
  }
});

// Join a guild via invite code
guilds.post("/join", async (c) => {
  const wallet = c.get("wallet");
  const body = await c.req.json<{ inviteCode: string }>();
  try {
    const guild = joinGuild(wallet, body.inviteCode);
    return c.json(guild);
  } catch (e: any) {
    const errorMap: Record<string, [number, string]> = {
      ALREADY_IN_GUILD: [409, "You are already in a guild"],
      GUILD_NOT_FOUND: [404, "Invalid invite code"],
      GUILD_FULL: [409, "Guild is full (max 5 members)"],
      CHARACTER_NOT_FOUND: [404, "Create a character first"],
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

// Leave current guild
guilds.post("/leave", (c) => {
  const wallet = c.get("wallet");
  try {
    leaveGuild(wallet);
    return c.json({ message: "Left guild" });
  } catch (e: any) {
    if (e.message === "NOT_IN_GUILD") {
      return c.json(
        { error: "NOT_IN_GUILD", message: "You are not in a guild" },
        400
      );
    }
    throw e;
  }
});

export default guilds;
