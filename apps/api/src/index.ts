import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { initSchema } from "./db/schema.js";
import auth from "./routes/auth.js";
import character from "./routes/character.js";
import missions from "./routes/missions.js";
import inventory from "./routes/inventory.js";
import upgrades from "./routes/upgrades.js";
import claims from "./routes/claims.js";
import guilds from "./routes/guilds.js";
import raids from "./routes/raids.js";
import runs from "./routes/runs.js";
import skills from "./routes/skills.js";
import daily from "./routes/daily.js";

export let forceBossDay: boolean | null = null; // null = auto (Sunday), true/false = override

const app = new Hono().basePath("/api");

app.use("*", logger());
app.use("*", cors({
  origin: process.env.CORS_ORIGIN || "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.route("/auth", auth);
app.route("/character", character);
app.route("/missions", missions);
app.route("/inventory", inventory);
app.route("/upgrades", upgrades);
app.route("/claims", claims);
app.route("/guilds", guilds);
app.route("/raids", raids);
app.route("/runs", runs);
app.route("/skills", skills);
app.route("/daily", daily);

initSchema();
const { seedLootItems } = await import("./services/loot-service.js");
seedLootItems();

// Dev-only routes (not available in production)
if (process.env.NODE_ENV !== "production") {
  app.post("/dev/skip-timer", async (c) => {
    // Inline auth check
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "UNAUTHORIZED", message: "Missing token" }, 401);
    }
    const { verifyToken } = await import("./services/auth-service.js");
    const payload = verifyToken(header.slice(7));
    if (!payload) {
      return c.json({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);
    }

    const { getCharacter } = await import("./services/character-service.js");
    const char = getCharacter(payload.wallet);
    if (!char) {
      return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character" }, 404);
    }

    // Set active mission end time to now
    const db = (await import("./db/database.js")).default;
    const result = db
      .prepare(
        "UPDATE active_missions SET ends_at = datetime('now') WHERE character_id = ?"
      )
      .run(char.id);

    if (result.changes === 0) {
      return c.json({ message: "No active mission to skip" });
    }
    return c.json({ message: "Timer skipped! You can now claim." });
  });

  // Dev: Advance week (end current run, simulate new week)
  app.post("/dev/advance-week", async (c) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "UNAUTHORIZED", message: "Missing token" }, 401);
    }
    const { verifyToken } = await import("./services/auth-service.js");
    const payload = verifyToken(header.slice(7));
    if (!payload) {
      return c.json({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);
    }

    const { getActiveRun, endRun } = await import("./services/run-service.js");
    const run = getActiveRun(payload.wallet);
    if (run) {
      endRun(run.id);
      return c.json({ message: "Epoch advanced! Run ended and leaderboard updated." });
    }
    return c.json({ message: "No active epoch to end." });
  });

  // Dev: Add resources for testing
  app.post("/dev/add-resources", async (c) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "UNAUTHORIZED", message: "Missing token" }, 401);
    }
    const { verifyToken } = await import("./services/auth-service.js");
    const payload = verifyToken(header.slice(7));
    if (!payload) {
      return c.json({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);
    }

    const { getCharacter } = await import("./services/character-service.js");
    const char = getCharacter(payload.wallet);
    if (!char) {
      return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character" }, 404);
    }

    const db = (await import("./db/database.js")).default;
    db.prepare(
      "UPDATE inventories SET scrap = scrap + 500, crystal = crystal + 100, artifact = artifact + 10 WHERE character_id = ?"
    ).run(char.id);

    return c.json({ message: "Added 500 scrap, 100 crystal, 10 artifact" });
  });

  // Dev: Add skill points for testing skill tree
  app.post("/dev/add-skill-points", async (c) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "UNAUTHORIZED", message: "Missing token" }, 401);
    }
    const { verifyToken } = await import("./services/auth-service.js");
    const payload = verifyToken(header.slice(7));
    if (!payload) {
      return c.json({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);
    }

    const { getActiveRun, addSkillPoints } = await import("./services/run-service.js");
    const run = getActiveRun(payload.wallet);
    if (!run) {
      return c.json({ error: "NO_ACTIVE_RUN", message: "No active run" }, 400);
    }

    addSkillPoints(run.id, 10);
    return c.json({ message: "Added 10 skill points" });
  });

  // Dev: Add XP for testing level-ups
  app.post("/dev/add-xp", async (c) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "UNAUTHORIZED", message: "Missing token" }, 401);
    }
    const { verifyToken } = await import("./services/auth-service.js");
    const payload = verifyToken(header.slice(7));
    if (!payload) {
      return c.json({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);
    }

    const { getCharacter } = await import("./services/character-service.js");
    const char = getCharacter(payload.wallet);
    if (!char) {
      return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character" }, 404);
    }

    const { xpForLevel } = await import("./services/game-config.js");
    const db = (await import("./db/database.js")).default;
    const addXp = 500;
    let newXp = char.xp + addXp;
    let newLevel = char.level;
    while (newXp >= xpForLevel(newLevel)) {
      newXp -= xpForLevel(newLevel);
      newLevel++;
    }
    db.prepare("UPDATE characters SET xp = ?, level = ? WHERE id = ?").run(newXp, newLevel, char.id);
    return c.json({ message: `+${addXp} XP (now Lv.${newLevel})` });
  });

  // Dev: Toggle boss day on/off (overrides Sunday check)
  app.post("/dev/toggle-boss-day", (c) => {
    if (forceBossDay === true) {
      forceBossDay = null; // back to auto
    } else {
      forceBossDay = true; // force on
    }
    return c.json({ bossDay: forceBossDay === true || (forceBossDay === null && new Date().getDay() === 0) });
  });
}

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API server running on http://localhost:${info.port}`);
});
