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

    CREATE TABLE IF NOT EXISTS weekly_runs (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      class_id TEXT NOT NULL CHECK(class_id IN ('scout', 'guardian', 'mystic')),
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      lives_remaining INTEGER NOT NULL DEFAULT 3,
      score INTEGER NOT NULL DEFAULT 0,
      skill_points INTEGER NOT NULL DEFAULT 0,
      missions_completed INTEGER NOT NULL DEFAULT 0,
      boss_defeated INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS unlocked_skills (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES weekly_runs(id),
      skill_id TEXT NOT NULL,
      unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(run_id, skill_id)
    );

    CREATE TABLE IF NOT EXISTS guilds (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS guild_members (
      guild_id TEXT NOT NULL REFERENCES guilds(id),
      wallet_address TEXT NOT NULL,
      character_id TEXT NOT NULL REFERENCES characters(id),
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (guild_id, wallet_address)
    );

    CREATE TABLE IF NOT EXISTS active_raids (
      id TEXT PRIMARY KEY,
      raid_id TEXT NOT NULL,
      guild_id TEXT NOT NULL REFERENCES guilds(id),
      started_at TEXT NOT NULL,
      ends_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS raid_participants (
      raid_id TEXT NOT NULL REFERENCES active_raids(id),
      wallet_address TEXT NOT NULL,
      character_id TEXT NOT NULL REFERENCES characters(id),
      PRIMARY KEY (raid_id, wallet_address)
    );

    CREATE TABLE IF NOT EXISTS leaderboard (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      class_id TEXT NOT NULL,
      week_start TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      missions_completed INTEGER NOT NULL DEFAULT 0,
      boss_defeated INTEGER NOT NULL DEFAULT 0,
      UNIQUE(wallet_address, week_start)
    );

    CREATE TABLE IF NOT EXISTS run_events (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES weekly_runs(id),
      event_type TEXT NOT NULL,
      data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_run_events_run ON run_events(run_id);
  `);

  // Migrations — add columns if missing
  const cols = db.prepare("PRAGMA table_info(weekly_runs)").all() as { name: string }[];
  const colNames = cols.map(c => c.name);
  if (!colNames.includes("start_signature")) {
    db.exec("ALTER TABLE weekly_runs ADD COLUMN start_signature TEXT");
  }
  if (!colNames.includes("end_signature")) {
    db.exec("ALTER TABLE weekly_runs ADD COLUMN end_signature TEXT");
  }
  if (!colNames.includes("streak")) {
    db.exec("ALTER TABLE weekly_runs ADD COLUMN streak INTEGER NOT NULL DEFAULT 0");
  }
}
