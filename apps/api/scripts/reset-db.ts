/**
 * Full DB reset: deletes the SQLite file entirely.
 * The schema + seed data will be recreated on next server start.
 *
 * Usage:
 *   cd apps/api
 *   npx tsx scripts/reset-db.ts
 */
import fs from "node:fs";
import path from "node:path";

const DB_PATH = path.join(import.meta.dirname, "../data/game.db");

if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log("Deleted game.db — fresh DB will be created on next server start.");
} else {
  console.log("No game.db found, nothing to delete.");
}
