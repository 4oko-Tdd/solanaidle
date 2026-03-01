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
      state TEXT NOT NULL DEFAULT 'idle' CHECK(state IN ('idle', 'on_mission', 'in_boss_fight', 'dead')),
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

    CREATE TABLE IF NOT EXISTS daily_logins (
      wallet_address TEXT PRIMARY KEY,
      streak_day INTEGER NOT NULL DEFAULT 1,
      last_claim_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS permanent_loot (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      perk_type TEXT NOT NULL,
      perk_value REAL NOT NULL,
      mint_address TEXT,
      dropped_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weekly_buffs (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      buff_id TEXT NOT NULL,
      buff_name TEXT NOT NULL,
      epoch_start TEXT NOT NULL,
      consumed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS world_boss (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      max_hp INTEGER NOT NULL,
      current_hp INTEGER NOT NULL,
      week_start TEXT NOT NULL UNIQUE,
      spawned_at TEXT NOT NULL,
      killed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS boss_participants (
      boss_id TEXT NOT NULL REFERENCES world_boss(id),
      wallet_address TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      passive_damage INTEGER NOT NULL DEFAULT 0,
      crit_damage INTEGER NOT NULL DEFAULT 0,
      crit_used INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (boss_id, wallet_address)
    );

    CREATE TABLE IF NOT EXISTS skr_wallets (
      wallet_address TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS skr_distribution (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      burned INTEGER NOT NULL DEFAULT 0,
      treasury INTEGER NOT NULL DEFAULT 0,
      reserve INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS skr_spends (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      week_start TEXT NOT NULL,
      action TEXT NOT NULL,
      amount INTEGER NOT NULL,
      burned INTEGER NOT NULL,
      treasury INTEGER NOT NULL,
      reserve INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS skr_payments (
      signature TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      week_start TEXT NOT NULL,
      action TEXT NOT NULL,
      amount INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS boss_epoch_state (
      wallet_address TEXT NOT NULL,
      week_start TEXT NOT NULL,
      reconnect_used INTEGER NOT NULL DEFAULT 0,
      overload_amp_used INTEGER NOT NULL DEFAULT 0,
      raid_license INTEGER NOT NULL DEFAULT 0,
      destabilized INTEGER NOT NULL DEFAULT 0,
      destabilized_at TEXT,
      last_roll_at TEXT,
      PRIMARY KEY (wallet_address, week_start)
    );

    CREATE TABLE IF NOT EXISTS inventory_capacity (
      wallet_address TEXT PRIMARY KEY,
      max_slots INTEGER NOT NULL DEFAULT 3
    );

    CREATE TABLE IF NOT EXISTS character_perks (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      perk_id TEXT NOT NULL,
      stacks INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS quest_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL,
      quest_id TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      period_key TEXT NOT NULL,
      result_json TEXT,
      UNIQUE(wallet_address, quest_id, period_key)
    );

    CREATE TABLE IF NOT EXISTS quest_boosts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL,
      quest_id TEXT NOT NULL,
      boost_type TEXT NOT NULL,
      boost_percent REAL NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS achievement_badges (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      earned_at TEXT NOT NULL DEFAULT (datetime('now')),
      mint_address TEXT,
      UNIQUE(wallet_address, achievement_id)
    );
  `);

  db.prepare(`
    CREATE TABLE IF NOT EXISTS challenge_progress (
      wallet_address TEXT NOT NULL,
      quest_id TEXT NOT NULL,
      period_key TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (wallet_address, quest_id, period_key)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS lifetime_stats (
      wallet_address TEXT PRIMARY KEY,
      missions_completed INTEGER NOT NULL DEFAULT 0,
      boss_kills INTEGER NOT NULL DEFAULT 0,
      raids_completed INTEGER NOT NULL DEFAULT 0,
      epochs_survived INTEGER NOT NULL DEFAULT 0
    )
  `).run();

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
  if (!colNames.includes("armor_level")) {
    db.exec("ALTER TABLE weekly_runs ADD COLUMN armor_level INTEGER NOT NULL DEFAULT 0");
  }
  if (!colNames.includes("engine_level")) {
    db.exec("ALTER TABLE weekly_runs ADD COLUMN engine_level INTEGER NOT NULL DEFAULT 0");
  }
  if (!colNames.includes("scanner_level")) {
    db.exec("ALTER TABLE weekly_runs ADD COLUMN scanner_level INTEGER NOT NULL DEFAULT 0");
  }

  // Check and add bonus_perk_points column
  if (!colNames.includes("bonus_perk_points")) {
    db.prepare("ALTER TABLE weekly_runs ADD COLUMN bonus_perk_points INTEGER NOT NULL DEFAULT 0").run();
  }
  if (!colNames.includes("perk_pending_rerolled")) {
    db.prepare("ALTER TABLE weekly_runs ADD COLUMN perk_pending_rerolled INTEGER NOT NULL DEFAULT 0").run();
  }

  // Migrations — active_missions columns
  const missionCols = db.prepare("PRAGMA table_info(active_missions)").all() as { name: string }[];
  const missionColNames = missionCols.map(c => c.name);
  if (!missionColNames.includes("reroll_stacks")) {
    db.exec("ALTER TABLE active_missions ADD COLUMN reroll_stacks INTEGER NOT NULL DEFAULT 0");
  }
  if (!missionColNames.includes("insured")) {
    db.exec("ALTER TABLE active_missions ADD COLUMN insured INTEGER NOT NULL DEFAULT 0");
  }
  if (!missionColNames.includes("run_id")) {
    db.exec("ALTER TABLE active_missions ADD COLUMN run_id TEXT");
  }

  // Migrations — boss_participants: overload_signature column
  const bossPartCols = db.prepare("PRAGMA table_info(boss_participants)").all() as { name: string }[];
  if (!bossPartCols.map(c => c.name).includes("overload_signature")) {
    db.exec("ALTER TABLE boss_participants ADD COLUMN overload_signature TEXT");
  }

  const spendCols = db.prepare("PRAGMA table_info(skr_spends)").all() as { name: string }[];
  if (!spendCols.map((c) => c.name).includes("week_start")) {
    db.exec("ALTER TABLE skr_spends ADD COLUMN week_start TEXT NOT NULL DEFAULT ''");
  }

  db.prepare(
    "INSERT OR IGNORE INTO skr_distribution (id, burned, treasury, reserve) VALUES (1, 0, 0, 0)"
  ).run();

  // Migrations — nft_claims: mint_address column
  const claimCols = db.prepare("PRAGMA table_info(nft_claims)").all() as { name: string }[];
  const claimColNames = claimCols.map(c => c.name);
  if (!claimColNames.includes("mint_address")) {
    db.exec("ALTER TABLE nft_claims ADD COLUMN mint_address TEXT");
  }

  // Migrations — characters: update CHECK constraint to include 'in_boss_fight'
  db.exec("DROP TABLE IF EXISTS characters_new");
  const charInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='characters'").get() as { sql: string } | undefined;
  if (charInfo && !charInfo.sql.includes("in_boss_fight")) {
    db.pragma("foreign_keys = OFF");
    db.exec(`
      CREATE TABLE characters_new (
        id TEXT PRIMARY KEY,
        wallet_address TEXT UNIQUE NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        xp INTEGER NOT NULL DEFAULT 0,
        hp INTEGER NOT NULL DEFAULT 100,
        gear_level INTEGER NOT NULL DEFAULT 1,
        state TEXT NOT NULL DEFAULT 'idle' CHECK(state IN ('idle', 'on_mission', 'in_boss_fight', 'dead')),
        revive_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO characters_new SELECT * FROM characters;
      DROP TABLE characters;
      ALTER TABLE characters_new RENAME TO characters;
    `);
    db.pragma("foreign_keys = ON");
  }

  // Add fast_slot_unlocked to weekly_runs
  const runColsFastSlot = db.prepare("PRAGMA table_info(weekly_runs)").all() as { name: string }[];
  if (!runColsFastSlot.map(c => c.name).includes("fast_slot_unlocked")) {
    db.prepare("ALTER TABLE weekly_runs ADD COLUMN fast_slot_unlocked INTEGER NOT NULL DEFAULT 0").run();
  }

  // Recreate active_missions with (character_id, slot) unique constraint
  const amSql = (db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='active_missions'")
    .get() as { sql: string } | undefined)?.sql ?? "";
  if (!amSql.includes("slot")) {
    db.pragma("foreign_keys = OFF");
    db.prepare(`
      CREATE TABLE active_missions_new (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL REFERENCES characters(id),
        mission_id TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ends_at TEXT NOT NULL,
        reroll_stacks INTEGER NOT NULL DEFAULT 0,
        insured INTEGER NOT NULL DEFAULT 0,
        run_id TEXT,
        slot TEXT NOT NULL DEFAULT 'main',
        UNIQUE(character_id, slot)
      )
    `).run();
    db.prepare(`
      INSERT INTO active_missions_new
        SELECT id, character_id, mission_id, started_at, ends_at,
          COALESCE(reroll_stacks,0), COALESCE(insured,0), run_id, 'main'
        FROM active_missions
    `).run();
    db.prepare("DROP TABLE active_missions").run();
    db.prepare("ALTER TABLE active_missions_new RENAME TO active_missions").run();
    db.pragma("foreign_keys = ON");
  }

}
