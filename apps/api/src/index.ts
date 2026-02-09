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

const app = new Hono().basePath("/api");

app.use("*", logger());
app.use("*", cors());

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.route("/auth", auth);
app.route("/character", character);
app.route("/missions", missions);
app.route("/inventory", inventory);
app.route("/upgrades", upgrades);
app.route("/claims", claims);

initSchema();

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
}

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`API server running on http://localhost:${info.port}`);
});
