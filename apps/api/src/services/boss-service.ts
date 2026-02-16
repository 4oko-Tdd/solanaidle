import { randomUUID } from "crypto";
import db from "../db/database.js";
import {
  BOSS_BASE_HP,
  BOSS_SCALING_FACTOR,
  BOSS_NAME,
  OVERLOAD_MULTIPLIERS,
} from "./game-config.js";

// ── Helpers ──

/** Returns true if current UTC time is Saturday (6) or Sunday (0) */
export function isBossPhase(): boolean {
  const day = new Date().getUTCDay();
  return day === 6 || day === 0;
}

/** Returns the Monday 00:00 UTC of the current week as ISO string */
export function getWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff)
  );
  return monday.toISOString();
}

/** Count distinct active players this week (for HP scaling) */
export function getActivePlayerCount(): number {
  const weekStart = getWeekStart();
  const row = db
    .prepare(
      "SELECT COUNT(DISTINCT wallet_address) as cnt FROM weekly_runs WHERE active = 1 AND week_start = ?"
    )
    .get(weekStart) as { cnt: number } | undefined;
  return row?.cnt ?? 0;
}

// ── Boss types ──

interface BossRow {
  id: string;
  name: string;
  max_hp: number;
  current_hp: number;
  week_start: string;
  spawned_at: string;
  killed: number;
}

interface Boss {
  id: string;
  name: string;
  maxHp: number;
  currentHp: number;
  weekStart: string;
  spawnedAt: string;
  killed: boolean;
}

function mapBoss(row: BossRow): Boss {
  return {
    id: row.id,
    name: row.name,
    maxHp: row.max_hp,
    currentHp: row.current_hp,
    weekStart: row.week_start,
    spawnedAt: row.spawned_at,
    killed: row.killed === 1,
  };
}

interface Participant {
  bossId: string;
  walletAddress: string;
  joinedAt: string;
  passiveDamage: number;
  critDamage: number;
  critUsed: boolean;
}

interface ParticipantRow {
  boss_id: string;
  wallet_address: string;
  joined_at: string;
  passive_damage: number;
  crit_damage: number;
  crit_used: number;
}

function mapParticipant(row: ParticipantRow): Participant {
  return {
    bossId: row.boss_id,
    walletAddress: row.wallet_address,
    joinedAt: row.joined_at,
    passiveDamage: row.passive_damage,
    critDamage: row.crit_damage,
    critUsed: row.crit_used === 1,
  };
}

// ── Core functions ──

/** Get or spawn the world boss for this weekend. Returns null if not boss phase. */
export function getOrSpawnBoss(): Boss | null {
  if (!isBossPhase()) return null;

  const weekStart = getWeekStart();
  const existing = db
    .prepare("SELECT * FROM world_boss WHERE week_start = ?")
    .get(weekStart) as BossRow | undefined;

  if (existing) return mapBoss(existing);

  // Spawn new boss
  const playerCount = getActivePlayerCount();
  const maxHp = Math.max(
    BOSS_BASE_HP,
    Math.floor(BOSS_BASE_HP * playerCount * BOSS_SCALING_FACTOR)
  );
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO world_boss (id, name, max_hp, current_hp, week_start, spawned_at, killed)
     VALUES (?, ?, ?, ?, ?, ?, 0)`
  ).run(id, BOSS_NAME, maxHp, maxHp, weekStart, now);

  return {
    id,
    name: BOSS_NAME,
    maxHp,
    currentHp: maxHp,
    weekStart,
    spawnedAt: now,
    killed: false,
  };
}

/** Read the current week's boss without spawning. */
export function getCurrentBoss(): Boss | null {
  const weekStart = getWeekStart();
  const row = db
    .prepare("SELECT * FROM world_boss WHERE week_start = ?")
    .get(weekStart) as BossRow | undefined;
  return row ? mapBoss(row) : null;
}

/** Join the boss fight. */
export function joinBossFight(
  walletAddress: string
): { success: boolean; error?: string; participant?: Participant } {
  const boss = getCurrentBoss();
  if (!boss) {
    return { success: false, error: "BOSS_NOT_SPAWNED" };
  }
  if (boss.killed) {
    return { success: false, error: "BOSS_ALREADY_KILLED" };
  }

  // Player must have an active weekly run
  const weekStart = getWeekStart();
  const run = db
    .prepare(
      "SELECT id FROM weekly_runs WHERE wallet_address = ? AND week_start = ? AND active = 1"
    )
    .get(walletAddress, weekStart) as { id: string } | undefined;
  if (!run) {
    return { success: false, error: "NO_ACTIVE_RUN" };
  }

  // Already joined?
  const existing = db
    .prepare(
      "SELECT boss_id FROM boss_participants WHERE boss_id = ? AND wallet_address = ?"
    )
    .get(boss.id, walletAddress) as { boss_id: string } | undefined;
  if (existing) {
    return { success: false, error: "ALREADY_JOINED" };
  }

  // Character must be idle
  const char = db
    .prepare("SELECT id, state FROM characters WHERE wallet_address = ?")
    .get(walletAddress) as { id: string; state: string } | undefined;
  if (!char) {
    return { success: false, error: "NO_CHARACTER" };
  }
  if (char.state !== "idle") {
    return { success: false, error: "CHARACTER_BUSY" };
  }

  const now = new Date().toISOString();

  const joinTx = db.transaction(() => {
    db.prepare(
      `INSERT INTO boss_participants (boss_id, wallet_address, joined_at, passive_damage, crit_damage, crit_used)
       VALUES (?, ?, ?, 0, 0, 0)`
    ).run(boss.id, walletAddress, now);

    db.prepare("UPDATE characters SET state = 'in_boss_fight' WHERE id = ?").run(
      char.id
    );
  });
  joinTx();

  const participant: Participant = {
    bossId: boss.id,
    walletAddress,
    joinedAt: now,
    passiveDamage: 0,
    critDamage: 0,
    critUsed: false,
  };

  return { success: true, participant };
}

/** Get a participant record. */
export function getParticipant(
  walletAddress: string,
  bossId: string
): Participant | null {
  const row = db
    .prepare(
      "SELECT * FROM boss_participants WHERE boss_id = ? AND wallet_address = ?"
    )
    .get(bossId, walletAddress) as ParticipantRow | undefined;
  return row ? mapParticipant(row) : null;
}

/** Calculate and store passive damage for a single participant. */
export function calculatePassiveDamage(
  walletAddress: string,
  bossId: string
): number {
  const participant = db
    .prepare(
      "SELECT joined_at FROM boss_participants WHERE boss_id = ? AND wallet_address = ?"
    )
    .get(bossId, walletAddress) as { joined_at: string } | undefined;
  if (!participant) return 0;

  const hoursInFight =
    (Date.now() - new Date(participant.joined_at).getTime()) / 3600000;

  // Get player's run for gear levels + score
  const weekStart = getWeekStart();
  const run = db
    .prepare(
      "SELECT armor_level, engine_level, scanner_level, score FROM weekly_runs WHERE wallet_address = ? AND week_start = ? AND active = 1"
    )
    .get(walletAddress, weekStart) as
    | { armor_level: number; engine_level: number; scanner_level: number; score: number }
    | undefined;

  const armorLevel = run?.armor_level ?? 0;
  const engineLevel = run?.engine_level ?? 0;
  const scannerLevel = run?.scanner_level ?? 0;
  const score = run?.score ?? 0;

  const basePower =
    10 +
    armorLevel * 3 +
    engineLevel * 2 +
    scannerLevel * 2 +
    score / 100;

  const damage = Math.floor(basePower * hoursInFight);

  db.prepare(
    "UPDATE boss_participants SET passive_damage = ? WHERE boss_id = ? AND wallet_address = ?"
  ).run(damage, bossId, walletAddress);

  return damage;
}

/** Use the OVERLOAD ability — burns all resources for crit damage. Once per fight. */
export function useOverload(
  walletAddress: string,
  bossId: string
): { success: boolean; damage?: number; error?: string } {
  const participant = db
    .prepare(
      "SELECT * FROM boss_participants WHERE boss_id = ? AND wallet_address = ?"
    )
    .get(bossId, walletAddress) as ParticipantRow | undefined;
  if (!participant) {
    return { success: false, error: "NOT_IN_FIGHT" };
  }
  if (participant.crit_used === 1) {
    return { success: false, error: "OVERLOAD_ALREADY_USED" };
  }

  // Get character for inventory lookup
  const char = db
    .prepare("SELECT id FROM characters WHERE wallet_address = ?")
    .get(walletAddress) as { id: string } | undefined;
  if (!char) {
    return { success: false, error: "NO_CHARACTER" };
  }

  const inv = db
    .prepare("SELECT scrap, crystal, artifact FROM inventories WHERE character_id = ?")
    .get(char.id) as
    | { scrap: number; crystal: number; artifact: number }
    | undefined;
  if (!inv) {
    return { success: false, error: "NO_INVENTORY" };
  }

  let damage =
    inv.scrap * OVERLOAD_MULTIPLIERS.scrap +
    inv.crystal * OVERLOAD_MULTIPLIERS.crystal +
    inv.artifact * OVERLOAD_MULTIPLIERS.artifact;

  // Check for critical_overload perk (1.5x multiplier)
  const weekStart = getWeekStart();
  const run = db
    .prepare(
      "SELECT id FROM weekly_runs WHERE wallet_address = ? AND week_start = ? AND active = 1"
    )
    .get(walletAddress, weekStart) as { id: string } | undefined;

  if (run) {
    const hasCritPerk = db
      .prepare(
        "SELECT id FROM character_perks WHERE run_id = ? AND perk_id = 'critical_overload'"
      )
      .get(run.id);
    if (hasCritPerk) {
      damage = Math.floor(damage * 1.5);
    }
  }

  const overloadTx = db.transaction(() => {
    // Zero out inventory
    db.prepare(
      "UPDATE inventories SET scrap = 0, crystal = 0, artifact = 0 WHERE character_id = ?"
    ).run(char.id);

    // Record crit damage
    db.prepare(
      "UPDATE boss_participants SET crit_used = 1, crit_damage = ? WHERE boss_id = ? AND wallet_address = ?"
    ).run(damage, bossId, walletAddress);

    // Apply damage to boss
    db.prepare(
      "UPDATE world_boss SET current_hp = MAX(0, current_hp - ?) WHERE id = ?"
    ).run(damage, bossId);

    // Check if boss is dead
    const boss = db
      .prepare("SELECT current_hp FROM world_boss WHERE id = ?")
      .get(bossId) as { current_hp: number };
    if (boss.current_hp <= 0) {
      db.prepare("UPDATE world_boss SET killed = 1 WHERE id = ?").run(bossId);
    }
  });
  overloadTx();

  return { success: true, damage };
}

/** Recalculate all passive damage and apply to boss HP. */
export function updateAllPassiveDamage(bossId: string): void {
  const participants = db
    .prepare("SELECT wallet_address FROM boss_participants WHERE boss_id = ?")
    .all(bossId) as { wallet_address: string }[];

  let totalPassive = 0;
  for (const p of participants) {
    const dmg = calculatePassiveDamage(p.wallet_address, bossId);
    totalPassive += dmg;
  }

  // Also sum crit damage
  const critRow = db
    .prepare(
      "SELECT COALESCE(SUM(crit_damage), 0) as total FROM boss_participants WHERE boss_id = ?"
    )
    .get(bossId) as { total: number };

  const totalDamage = totalPassive + critRow.total;

  const boss = db
    .prepare("SELECT max_hp FROM world_boss WHERE id = ?")
    .get(bossId) as { max_hp: number } | undefined;
  if (!boss) return;

  const newHp = Math.max(0, boss.max_hp - totalDamage);

  db.prepare("UPDATE world_boss SET current_hp = ? WHERE id = ?").run(
    newHp,
    bossId
  );

  if (newHp <= 0) {
    db.prepare("UPDATE world_boss SET killed = 1 WHERE id = ?").run(bossId);
  }
}

/** Get boss status with optional player contribution. */
export function getBossStatus(
  bossId: string,
  walletAddress?: string
): {
  boss: Boss | null;
  participantCount: number;
  totalDamage: number;
  playerContribution?: number;
} | null {
  const row = db
    .prepare("SELECT * FROM world_boss WHERE id = ?")
    .get(bossId) as BossRow | undefined;
  if (!row) return null;

  const boss = mapBoss(row);

  const countRow = db
    .prepare(
      "SELECT COUNT(*) as cnt FROM boss_participants WHERE boss_id = ?"
    )
    .get(bossId) as { cnt: number };

  const dmgRow = db
    .prepare(
      "SELECT COALESCE(SUM(passive_damage + crit_damage), 0) as total FROM boss_participants WHERE boss_id = ?"
    )
    .get(bossId) as { total: number };

  const result: {
    boss: Boss;
    participantCount: number;
    totalDamage: number;
    playerContribution?: number;
  } = {
    boss,
    participantCount: countRow.cnt,
    totalDamage: dmgRow.total,
  };

  if (walletAddress) {
    const playerRow = db
      .prepare(
        "SELECT (passive_damage + crit_damage) as player_total FROM boss_participants WHERE boss_id = ? AND wallet_address = ?"
      )
      .get(bossId, walletAddress) as { player_total: number } | undefined;

    if (playerRow && dmgRow.total > 0) {
      result.playerContribution = playerRow.player_total / dmgRow.total;
    } else {
      result.playerContribution = 0;
    }
  }

  return result;
}

/** Resolve boss fight — compute contribution percentages for all participants. */
export function resolveBoss(
  bossId: string
): {
  killed: boolean;
  participants: { wallet: string; contribution: number; totalDamage: number }[];
} {
  const boss = db
    .prepare("SELECT * FROM world_boss WHERE id = ?")
    .get(bossId) as BossRow | undefined;
  if (!boss) {
    return { killed: false, participants: [] };
  }

  const rows = db
    .prepare(
      "SELECT wallet_address, passive_damage, crit_damage FROM boss_participants WHERE boss_id = ?"
    )
    .all(bossId) as {
    wallet_address: string;
    passive_damage: number;
    crit_damage: number;
  }[];

  let grandTotal = 0;
  const entries = rows.map((r) => {
    const total = r.passive_damage + r.crit_damage;
    grandTotal += total;
    return { wallet: r.wallet_address, totalDamage: total };
  });

  const participants = entries.map((e) => ({
    ...e,
    contribution: grandTotal > 0 ? e.totalDamage / grandTotal : 0,
  }));

  return {
    killed: boss.killed === 1,
    participants,
  };
}
