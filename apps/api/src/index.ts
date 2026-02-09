import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { initSchema } from "./db/schema.js";

const app = new Hono().basePath("/api");

app.use("*", logger());
app.use("*", cors());

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// TODO: Mount route modules
// app.route("/auth", authRoutes);
// app.route("/character", characterRoutes);
// app.route("/missions", missionRoutes);
// app.route("/inventory", inventoryRoutes);
// app.route("/upgrades", upgradeRoutes);
// app.route("/claims", claimRoutes);

initSchema();

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`API server running on http://localhost:${info.port}`);
});
