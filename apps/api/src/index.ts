import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { initSchema } from "./db/schema.js";
import auth from "./routes/auth.js";
import character from "./routes/character.js";
import missions from "./routes/missions.js";

const app = new Hono().basePath("/api");

app.use("*", logger());
app.use("*", cors());

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.route("/auth", auth);
app.route("/character", character);
app.route("/missions", missions);

// TODO: Mount remaining route modules
// app.route("/inventory", inventoryRoutes);
// app.route("/upgrades", upgradeRoutes);
// app.route("/claims", claimRoutes);

initSchema();

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`API server running on http://localhost:${info.port}`);
});
