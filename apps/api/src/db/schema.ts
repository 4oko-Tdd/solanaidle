import db from "./database.js";

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      wallet_address TEXT UNIQUE NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0,
      hp INTEGER NOT NULL DEFAULT 100,
      gear_level INTEGER NOT NULL DEFAULT 1,
      state TEXT NOT NULL DEFAULT 'idle' CHECK(state IN ('idle', 'on_mission', 'dead')),
      revive_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS active_missions (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL REFERENCES characters(id),
      mission_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      UNIQUE(character_id)
    );

    CREATE TABLE IF NOT EXISTS inventories (
      character_id TEXT PRIMARY KEY REFERENCES characters(id),
      scrap INTEGER NOT NULL DEFAULT 0,
      crystal INTEGER NOT NULL DEFAULT 0,
      artifact INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS nft_claims (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL REFERENCES characters(id),
      mission_id TEXT NOT NULL,
      nft_name TEXT NOT NULL,
      claimed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS nonces (
      nonce TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
