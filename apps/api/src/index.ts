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
import daily from "./routes/daily.js";
import nfts from "./routes/nft-routes.js";
import boss from "./routes/boss-routes.js";
import perks from "./routes/perk-routes.js";
import collection from "./routes/collection-routes.js";

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
app.route("/daily", daily);
app.route("/nfts", nfts);
app.route("/boss", boss);
app.route("/perks", perks);
app.route("/collection", collection);

initSchema();
const { ensureCollections } = await import("./services/metaplex-service.js");
ensureCollections().catch((err) => console.error("Collection init error:", err));

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

  // Dev: Force end current epoch (for testing finalization)
  app.post("/dev/end-epoch", async (c) => {
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
    if (!run) {
      return c.json({ error: "NO_ACTIVE_RUN", message: "No active run" }, 400);
    }
    // Cancel any active mission so the run can end cleanly
    const db = (await import("./db/database.js")).default;
    const { getCharacter } = await import("./services/character-service.js");
    const char = getCharacter(payload.wallet);
    if (char) {
      db.prepare("DELETE FROM active_missions WHERE character_id = ?").run(char.id);
      db.prepare("UPDATE characters SET state = 'idle' WHERE id = ?").run(char.id);
    }
    endRun(run.id);
    return c.json({ message: "Epoch ended" });
  });

  // Dev: Reset epoch -- delete finalized run so a new one can start
  app.post("/dev/reset-epoch", async (c) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "UNAUTHORIZED", message: "Missing token" }, 401);
    }
    const { verifyToken } = await import("./services/auth-service.js");
    const payload = verifyToken(header.slice(7));
    if (!payload) {
      return c.json({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);
    }

    const db = (await import("./db/database.js")).default;
    const { getWeekBounds } = await import("./services/run-service.js");
    const { weekStart } = getWeekBounds();

    // Delete this week's finalized run + its events
    const run = db.prepare(
      "SELECT id FROM weekly_runs WHERE wallet_address = ? AND week_start = ? AND active = 0"
    ).get(payload.wallet, weekStart) as any;

    if (run) {
      db.prepare("DELETE FROM run_events WHERE run_id = ?").run(run.id);
      db.prepare("DELETE FROM weekly_runs WHERE id = ?").run(run.id);
      db.prepare("DELETE FROM leaderboard WHERE wallet_address = ? AND week_start = ?").run(payload.wallet, weekStart);
      return c.json({ message: "Epoch reset! You can start a new run." });
    }

    // Also delete any active run
    const activeRun = db.prepare(
      "SELECT id FROM weekly_runs WHERE wallet_address = ? AND week_start = ? AND active = 1"
    ).get(payload.wallet, weekStart) as any;

    if (activeRun) {
      db.prepare("DELETE FROM run_events WHERE run_id = ?").run(activeRun.id);
      db.prepare("DELETE FROM weekly_runs WHERE id = ?").run(activeRun.id);
      return c.json({ message: "Active run deleted! You can start fresh." });
    }

    return c.json({ message: "No epoch to reset." });
  });

  // Dev: Force-spawn boss (bypasses weekend check)
  app.post("/dev/spawn-boss", async (c) => {
    const { randomUUID } = await import("crypto");
    const db = (await import("./db/database.js")).default;
    const { getWeekStart, getActivePlayerCount } = await import("./services/boss-service.js");
    const { BOSS_BASE_HP, BOSS_SCALING_FACTOR, BOSS_NAME } = await import("./services/game-config.js");

    const weekStart = getWeekStart();
    const existing = db
      .prepare("SELECT id FROM world_boss WHERE week_start = ?")
      .get(weekStart) as { id: string } | undefined;

    if (existing) {
      // Despawn — remove boss and participants
      db.prepare("DELETE FROM boss_participants WHERE boss_id = ?").run(existing.id);
      db.prepare("DELETE FROM world_boss WHERE id = ?").run(existing.id);
      // Reset any characters stuck in boss fight
      db.prepare("UPDATE characters SET state = 'idle' WHERE state = 'in_boss_fight'").run();
      return c.json({ message: "Boss despawned", spawned: false });
    }

    const playerCount = getActivePlayerCount();
    const maxHp = Math.max(BOSS_BASE_HP, Math.floor(BOSS_BASE_HP * playerCount * BOSS_SCALING_FACTOR));
    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO world_boss (id, name, max_hp, current_hp, week_start, spawned_at, killed)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    ).run(id, BOSS_NAME, maxHp, maxHp, weekStart, now);

    return c.json({ message: `Boss spawned: ${BOSS_NAME} (${maxHp} HP)`, spawned: true });
  });

  // Dev: Reset daily login claim (for testing daily modal)
  app.post("/dev/reset-daily", async (c) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "UNAUTHORIZED", message: "Missing token" }, 401);
    }
    const { verifyToken } = await import("./services/auth-service.js");
    const payload = verifyToken(header.slice(7));
    if (!payload) {
      return c.json({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);
    }
    const db = (await import("./db/database.js")).default;
    db.prepare("DELETE FROM daily_logins WHERE wallet_address = ?").run(payload.wallet);
    return c.json({ message: "Daily login reset" });
  });

  // Dev: Add SKR balance for monetization testing
  app.post("/dev/add-skr", async (c) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "UNAUTHORIZED", message: "Missing token" }, 401);
    }
    const { verifyToken } = await import("./services/auth-service.js");
    const payload = verifyToken(header.slice(7));
    if (!payload) {
      return c.json({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);
    }
    const { mintMockSkrToWallet } = await import("./services/skr-service.js");
    try {
      const minted = await mintMockSkrToWallet(payload.wallet, 100);
      return c.json({
        message: `+100 SKR minted on devnet (now ${minted.balance})`,
        signature: minted.signature,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Mint failed";
      return c.json(
        {
          error: "SKR_MINT_FAILED",
          message,
        },
        400
      );
    }
  });

  // Dev: Toggle destabilized state for current epoch
  app.post("/dev/toggle-destabilized", async (c) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "UNAUTHORIZED", message: "Missing token" }, 401);
    }
    const { verifyToken } = await import("./services/auth-service.js");
    const payload = verifyToken(header.slice(7));
    if (!payload) {
      return c.json({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);
    }
    const db = (await import("./db/database.js")).default;
    const { getWeekStart } = await import("./services/boss-service.js");
    const weekStart = getWeekStart();
    const w = payload.wallet;
    db.prepare(
      `INSERT OR IGNORE INTO boss_epoch_state
       (wallet_address, week_start, reconnect_used, overload_amp_used, raid_license, destabilized)
       VALUES (?, ?, 0, 0, 0, 0)`
    ).run(w, weekStart);
    const state = db.prepare(
      "SELECT destabilized FROM boss_epoch_state WHERE wallet_address = ? AND week_start = ?"
    ).get(w, weekStart) as { destabilized: number } | undefined;
    const next = state?.destabilized === 1 ? 0 : 1;
    db.prepare(
      "UPDATE boss_epoch_state SET destabilized = ?, destabilized_at = ? WHERE wallet_address = ? AND week_start = ?"
    ).run(next, next ? new Date().toISOString() : null, w, weekStart);
    return c.json({ message: `Destabilized: ${next === 1 ? "ON" : "OFF"}` });
  });

  // Dev: Force raid license on/off for current epoch
  app.post("/dev/toggle-raid-license", async (c) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "UNAUTHORIZED", message: "Missing token" }, 401);
    }
    const { verifyToken } = await import("./services/auth-service.js");
    const payload = verifyToken(header.slice(7));
    if (!payload) {
      return c.json({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);
    }
    const db = (await import("./db/database.js")).default;
    const { getWeekStart } = await import("./services/boss-service.js");
    const weekStart = getWeekStart();
    const w = payload.wallet;
    db.prepare(
      `INSERT OR IGNORE INTO boss_epoch_state
       (wallet_address, week_start, reconnect_used, overload_amp_used, raid_license, destabilized)
       VALUES (?, ?, 0, 0, 0, 0)`
    ).run(w, weekStart);
    const state = db.prepare(
      "SELECT raid_license FROM boss_epoch_state WHERE wallet_address = ? AND week_start = ?"
    ).get(w, weekStart) as { raid_license: number } | undefined;
    const next = state?.raid_license === 1 ? 0 : 1;
    db.prepare(
      "UPDATE boss_epoch_state SET raid_license = ? WHERE wallet_address = ? AND week_start = ?"
    ).run(next, w, weekStart);
    return c.json({ message: `Raid License: ${next === 1 ? "ON" : "OFF"}` });
  });

  // Dev: Force overload amplifier on/off for current epoch
  app.post("/dev/toggle-overload-amp", async (c) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "UNAUTHORIZED", message: "Missing token" }, 401);
    }
    const { verifyToken } = await import("./services/auth-service.js");
    const payload = verifyToken(header.slice(7));
    if (!payload) {
      return c.json({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);
    }
    const db = (await import("./db/database.js")).default;
    const { getWeekStart } = await import("./services/boss-service.js");
    const weekStart = getWeekStart();
    const w = payload.wallet;
    db.prepare(
      `INSERT OR IGNORE INTO boss_epoch_state
       (wallet_address, week_start, reconnect_used, overload_amp_used, raid_license, destabilized)
       VALUES (?, ?, 0, 0, 0, 0)`
    ).run(w, weekStart);
    const state = db.prepare(
      "SELECT overload_amp_used FROM boss_epoch_state WHERE wallet_address = ? AND week_start = ?"
    ).get(w, weekStart) as { overload_amp_used: number } | undefined;
    const next = state?.overload_amp_used === 1 ? 0 : 1;
    db.prepare(
      "UPDATE boss_epoch_state SET overload_amp_used = ? WHERE wallet_address = ? AND week_start = ?"
    ).run(next, w, weekStart);
    return c.json({ message: `Overload Amp: ${next === 1 ? "ON" : "OFF"}` });
  });

  // Dev: Reset boss monetization state for current epoch
  app.post("/dev/reset-boss-monetization", async (c) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "UNAUTHORIZED", message: "Missing token" }, 401);
    }
    const { verifyToken } = await import("./services/auth-service.js");
    const payload = verifyToken(header.slice(7));
    if (!payload) {
      return c.json({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);
    }
    const db = (await import("./db/database.js")).default;
    const { getWeekStart } = await import("./services/boss-service.js");
    const weekStart = getWeekStart();
    db.prepare(
      `DELETE FROM boss_epoch_state WHERE wallet_address = ? AND week_start = ?`
    ).run(payload.wallet, weekStart);
    return c.json({ message: "Boss monetization state reset (this epoch)" });
  });

  // Dev: Reset DB -- wipe everything for this player
  app.post("/dev/reset-player", async (c) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "UNAUTHORIZED", message: "Missing token" }, 401);
    }
    const { verifyToken } = await import("./services/auth-service.js");
    const payload = verifyToken(header.slice(7));
    if (!payload) {
      return c.json({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);
    }

    const db = (await import("./db/database.js")).default;
    const { getCharacter } = await import("./services/character-service.js");
    const char = getCharacter(payload.wallet);
    const w = payload.wallet;

    db.pragma("foreign_keys = OFF");
    try {
      // Wallet-level data
      db.prepare("DELETE FROM boss_participants WHERE wallet_address = ?").run(w);
      db.prepare("DELETE FROM permanent_loot WHERE wallet_address = ?").run(w);
      db.prepare("DELETE FROM weekly_buffs WHERE wallet_address = ?").run(w);
      db.prepare("DELETE FROM inventory_capacity WHERE wallet_address = ?").run(w);
      db.prepare("DELETE FROM leaderboard WHERE wallet_address = ?").run(w);
      db.prepare("DELETE FROM daily_logins WHERE wallet_address = ?").run(w);
      db.prepare("DELETE FROM boss_epoch_state WHERE wallet_address = ?").run(w);
      db.prepare("DELETE FROM skr_spends WHERE wallet_address = ?").run(w);
      db.prepare("DELETE FROM skr_payments WHERE wallet_address = ?").run(w);
      db.prepare("DELETE FROM skr_wallets WHERE wallet_address = ?").run(w);

      // Runs + events
      const runs = db.prepare("SELECT id FROM weekly_runs WHERE wallet_address = ?").all(w) as any[];
      for (const r of runs) {
        db.prepare("DELETE FROM run_events WHERE run_id = ?").run(r.id);
        db.prepare("DELETE FROM character_perks WHERE run_id = ?").run(r.id);
      }
      db.prepare("DELETE FROM weekly_runs WHERE wallet_address = ?").run(w);

      if (char) {
        db.prepare("DELETE FROM guild_members WHERE character_id = ?").run(char.id);
        db.prepare("DELETE FROM inventories WHERE character_id = ?").run(char.id);
        db.prepare("DELETE FROM active_missions WHERE character_id = ?").run(char.id);
        db.prepare("DELETE FROM nft_claims WHERE character_id = ?").run(char.id);
        db.prepare("DELETE FROM characters WHERE id = ?").run(char.id);
      }
    } finally {
      db.pragma("foreign_keys = ON");
    }

    return c.json({ message: "Player data wiped. Refresh to start over." });
  });
}

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`API server running on http://0.0.0.0:${info.port}`);
});
