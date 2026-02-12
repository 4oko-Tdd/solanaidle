/**
 * Hard reset: delete ALL player wallets/progress from the DB.
 * - Removes characters, runs, loot, inventories, missions, guild members, raid participants, leaderboard, daily logins.
 * - Keeps static config tables (guilds definitions, raids, etc.).
 *
 * Usage:
 *   cd apps/api
 *   npx tsx scripts/reset-all-wallets.ts
 */
import db from "../src/db/database.js";

console.log("Resetting ALL player data (wallets, characters, runs, loot, inventories, missions...)");

const tx = db.transaction(() => {
  // Order matters because of foreign keys
  db.prepare("DELETE FROM raid_participants").run();
  db.prepare("DELETE FROM guild_members").run();
  db.prepare("DELETE FROM active_missions").run();
  db.prepare("DELETE FROM nft_claims").run();
  db.prepare("DELETE FROM character_loot").run();
  db.prepare("DELETE FROM inventories").run();
  db.prepare("DELETE FROM run_events").run();
  db.prepare("DELETE FROM unlocked_skills").run();
  db.prepare("DELETE FROM leaderboard").run();
  db.prepare("DELETE FROM daily_logins").run();
  db.prepare("DELETE FROM weekly_runs").run();
  db.prepare("DELETE FROM characters").run();
});

tx();

console.log("Done. All player wallets and related progress removed from DB.");

