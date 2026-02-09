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

// TODO: Mount remaining route modules
// app.route("/claims", claimRoutes);

initSchema();

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`API server running on http://localhost:${info.port}`);
});
