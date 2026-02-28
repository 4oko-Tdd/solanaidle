import { randomUUID } from "crypto";
import db from "../db/database.js";
import {
  BOSS_BASE_HP,
  BOSS_SCALING_FACTOR,
  BOSS_NAME,
  OVERLOAD_MULTIPLIERS,
} from "./game-config.js";
import {
  initializeBossOnChain,
  applyDamageOnER,
  finalizeBossOnChain,
} from "./boss-er-service.js";
import { getSkrBalance, verifyAndRecordSkrPayment } from "./skr-service.js";
import { trackChallengeProgress } from "./challenge-service.js";

const DESTABILIZE_ROLL_CHANCE = 0.12;
const DESTABILIZE_ROLL_INTERVAL_MS = 20 * 60 * 1000;
const DESTABILIZE_FREE_RECOVERY_MS = 15 * 60 * 1000;
const SKR_COSTS = {
  reconnect: 25,
  overloadAmplifier: 18,
  raidLicense: 35,
} as const;

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

interface BossEpochStateRow {
  wallet_address: string;
  week_start: string;
  reconnect_used: number;
  overload_amp_used: number;
  raid_license: number;
  destabilized: number;
  destabilized_at: string | null;
  last_roll_at: string | null;
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

function ensureBossEpochState(walletAddress: string, weekStart: string): BossEpochStateRow {
  db.prepare(
    `INSERT OR IGNORE INTO boss_epoch_state
      (wallet_address, week_start, reconnect_used, overload_amp_used, raid_license, destabilized)
     VALUES (?, ?, 0, 0, 0, 0)`
  ).run(walletAddress, weekStart);

  return db
    .prepare("SELECT * FROM boss_epoch_state WHERE wallet_address = ? AND week_start = ?")
    .get(walletAddress, weekStart) as BossEpochStateRow;
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

  // Initialize boss PDA on-chain and delegate to ER
  const weekStartTs = Math.floor(new Date(weekStart).getTime() / 1000);
  initializeBossOnChain(weekStartTs, maxHp).catch(() => {});

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

  // Track challenge progress for boss_join
  try {
    trackChallengeProgress(walletAddress, "boss_join", 1, char.id);
  } catch {}

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
  const weekStart = getWeekStart();
  const bossState = ensureBossEpochState(walletAddress, weekStart);
  const participant = db
    .prepare(
      "SELECT joined_at, passive_damage FROM boss_participants WHERE boss_id = ? AND wallet_address = ?"
    )
    .get(bossId, walletAddress) as { joined_at: string; passive_damage: number } | undefined;
  if (!participant) return 0;
  const now = Date.now();

  if (bossState.destabilized === 1) {
    const destabilizedAtMs = bossState.destabilized_at
      ? new Date(bossState.destabilized_at).getTime()
      : now;
    if (now - destabilizedAtMs >= DESTABILIZE_FREE_RECOVERY_MS) {
      db.prepare(
        "UPDATE boss_epoch_state SET destabilized = 0, destabilized_at = NULL, last_roll_at = ? WHERE wallet_address = ? AND week_start = ?"
      ).run(new Date(now).toISOString(), walletAddress, weekStart);
    } else {
      return participant.passive_damage;
    }
  }

  const lastRollAt = bossState.last_roll_at ? new Date(bossState.last_roll_at).getTime() : 0;
  const joinedAtMs = new Date(participant.joined_at).getTime();
  const canRollDestabilize =
    bossState.reconnect_used === 0 &&
    now - joinedAtMs > DESTABILIZE_ROLL_INTERVAL_MS &&
    now - lastRollAt > DESTABILIZE_ROLL_INTERVAL_MS;

  if (canRollDestabilize) {
    const rolledDestabilized = Math.random() < DESTABILIZE_ROLL_CHANCE;
    db.prepare(
      "UPDATE boss_epoch_state SET last_roll_at = ?, destabilized = ?, destabilized_at = ? WHERE wallet_address = ? AND week_start = ?"
    ).run(
      new Date(now).toISOString(),
      rolledDestabilized ? 1 : 0,
      rolledDestabilized ? new Date(now).toISOString() : null,
      walletAddress,
      weekStart
    );
    if (rolledDestabilized) {
      return participant.passive_damage;
    }
  }

  const hoursInFight =
    (now - joinedAtMs) / 3600000;

  // Get player's run for gear levels + score
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

  const efficiency = bossState.raid_license === 1 ? 1.05 : 1;
  const damage = Math.floor(basePower * efficiency * hoursInFight);

  db.prepare(
    "UPDATE boss_participants SET passive_damage = ? WHERE boss_id = ? AND wallet_address = ?"
  ).run(damage, bossId, walletAddress);

  return damage;
}

/** Use the OVERLOAD ability — burns all resources for crit damage. Once per fight. */
export async function useOverload(
  walletAddress: string,
  bossId: string,
  playerSignature?: string
): Promise<{ success: boolean; damage?: number; error?: string }> {
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

  const weekStart = getWeekStart();
  const bossState = ensureBossEpochState(walletAddress, weekStart);
  if (bossState.overload_amp_used === 1) {
    damage = Math.floor(damage * 1.1);
  }

  // Check for critical_overload perk (1.5x multiplier)
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

  // Track challenge progress for overload
  try {
    trackChallengeProgress(walletAddress, "overload", 1, char.id);
  } catch {}

  // Store player signature as proof of OVERLOAD authorization
  if (playerSignature) {
    db.prepare(
      "UPDATE boss_participants SET overload_signature = ? WHERE boss_id = ? AND wallet_address = ?"
    ).run(playerSignature, bossId, walletAddress);
  }

  // Push overload damage to ER (server-side, fire-and-forget)
  const weekStartOverload = getWeekStart();
  const weekStartTsOverload = Math.floor(new Date(weekStartOverload).getTime() / 1000);
  const overloadStatus = getBossStatus(bossId);
  if (overloadStatus?.boss) {
    applyDamageOnER(weekStartTsOverload, overloadStatus.totalDamage, overloadStatus.participantCount, overloadStatus.boss.maxHp).catch(() => {});
  }

  // If boss was killed, finalize on-chain
  const bossAfterOverload = db
    .prepare("SELECT killed FROM world_boss WHERE id = ?")
    .get(bossId) as { killed: number } | undefined;
  if (bossAfterOverload?.killed === 1) {
    finalizeBossOnChain(weekStartTsOverload).catch(() => {});
  }

  return { success: true, damage };
}

export async function purchaseRaidLicense(
  walletAddress: string,
  paymentSignature: string
): Promise<{ success: boolean; error?: string; skrBalance?: number }> {
  const weekStart = getWeekStart();
  const state = ensureBossEpochState(walletAddress, weekStart);
  if (state.raid_license === 1) {
    return { success: false, error: "RAID_LICENSE_ALREADY_ACTIVE" };
  }

  const payment = await verifyAndRecordSkrPayment({
    signature: paymentSignature,
    walletAddress,
    amount: SKR_COSTS.raidLicense,
    action: "raid_license",
    weekStart,
  });
  if (!payment.success) return { success: false, error: payment.error };

  db.prepare(
    "UPDATE boss_epoch_state SET raid_license = 1 WHERE wallet_address = ? AND week_start = ?"
  ).run(walletAddress, weekStart);

  return { success: true, skrBalance: await getSkrBalance(walletAddress) };
}

export async function purchaseOverloadAmplifier(
  walletAddress: string,
  paymentSignature: string
): Promise<{ success: boolean; error?: string; skrBalance?: number }> {
  const weekStart = getWeekStart();
  const boss = getCurrentBoss();
  if (!boss) return { success: false, error: "BOSS_NOT_ACTIVE" };

  const participant = db
    .prepare("SELECT crit_used FROM boss_participants WHERE boss_id = ? AND wallet_address = ?")
    .get(boss.id, walletAddress) as { crit_used: number } | undefined;
  if (!participant) return { success: false, error: "NOT_IN_FIGHT" };
  if (participant.crit_used === 1) return { success: false, error: "OVERLOAD_ALREADY_USED" };

  const state = ensureBossEpochState(walletAddress, weekStart);
  if (state.overload_amp_used === 1) return { success: false, error: "OVERLOAD_AMP_ALREADY_ACTIVE" };

  const payment = await verifyAndRecordSkrPayment({
    signature: paymentSignature,
    walletAddress,
    amount: SKR_COSTS.overloadAmplifier,
    action: "overload_amplifier",
    weekStart,
  });
  if (!payment.success) return { success: false, error: payment.error };

  db.prepare(
    "UPDATE boss_epoch_state SET overload_amp_used = 1 WHERE wallet_address = ? AND week_start = ?"
  ).run(walletAddress, weekStart);

  return { success: true, skrBalance: await getSkrBalance(walletAddress) };
}

export async function useReconnectProtocol(
  walletAddress: string,
  paymentSignature: string
): Promise<{ success: boolean; error?: string; skrBalance?: number }> {
  const weekStart = getWeekStart();
  const boss = getCurrentBoss();
  if (!boss) return { success: false, error: "BOSS_NOT_ACTIVE" };
  if (boss.killed) return { success: false, error: "BOSS_ALREADY_KILLED" };

  const participant = db
    .prepare("SELECT joined_at FROM boss_participants WHERE boss_id = ? AND wallet_address = ?")
    .get(boss.id, walletAddress) as { joined_at: string } | undefined;
  if (!participant) return { success: false, error: "NOT_IN_FIGHT" };

  const state = ensureBossEpochState(walletAddress, weekStart);
  if (state.reconnect_used === 1) return { success: false, error: "RECONNECT_ALREADY_USED" };
  if (state.destabilized === 0) return { success: false, error: "NODE_NOT_DESTABILIZED" };

  const payment = await verifyAndRecordSkrPayment({
    signature: paymentSignature,
    walletAddress,
    amount: SKR_COSTS.reconnect,
    action: "reconnect_protocol",
    weekStart,
  });
  if (!payment.success) return { success: false, error: payment.error };

  const now = Date.now();
  const destabilizedAt = state.destabilized_at ? new Date(state.destabilized_at).getTime() : now;
  const downtimeMs = Math.max(0, now - destabilizedAt);
  const joinedAtMs = new Date(participant.joined_at).getTime();
  const shiftedJoinedAt = new Date(joinedAtMs + downtimeMs).toISOString();

  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE boss_participants SET joined_at = ? WHERE boss_id = ? AND wallet_address = ?"
    ).run(shiftedJoinedAt, boss.id, walletAddress);
    db.prepare(
      `UPDATE boss_epoch_state
       SET reconnect_used = 1, destabilized = 0, destabilized_at = NULL, last_roll_at = ?
       WHERE wallet_address = ? AND week_start = ?`
    ).run(new Date(now).toISOString(), walletAddress, weekStart);
  });
  tx();

  return { success: true, skrBalance: await getSkrBalance(walletAddress) };
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

  // Push damage to ER
  const weekStartPassive = getWeekStart();
  const weekStartTsPassive = Math.floor(new Date(weekStartPassive).getTime() / 1000);
  applyDamageOnER(weekStartTsPassive, totalDamage, participants.length, boss.max_hp).catch(() => {});

  // If boss was killed, finalize on-chain
  if (newHp <= 0) {
    finalizeBossOnChain(weekStartTsPassive).catch(() => {});
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
  skrBalance?: number;
  reconnectUsed?: boolean;
  overloadAmpUsed?: boolean;
  raidLicense?: boolean;
  destabilized?: boolean;
  monetizationCosts?: {
    reconnect: number;
    overloadAmplifier: number;
    raidLicense: number;
    freeRecoveryMinutes: number;
  };
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
    hasJoined?: boolean;
    overloadUsed?: boolean;
    skrBalance?: number;
    reconnectUsed?: boolean;
    overloadAmpUsed?: boolean;
    raidLicense?: boolean;
    destabilized?: boolean;
    monetizationCosts?: {
      reconnect: number;
      overloadAmplifier: number;
      raidLicense: number;
      freeRecoveryMinutes: number;
    };
  } = {
    boss,
    participantCount: countRow.cnt,
    totalDamage: dmgRow.total,
  };

  if (walletAddress) {
    const weekStart = getWeekStart();
    const epochState = ensureBossEpochState(walletAddress, weekStart);
    const playerRow = db
      .prepare(
        "SELECT (passive_damage + crit_damage) as player_total, crit_used FROM boss_participants WHERE boss_id = ? AND wallet_address = ?"
      )
      .get(bossId, walletAddress) as { player_total: number; crit_used: number } | undefined;

    result.hasJoined = !!playerRow;
    result.overloadUsed = !!playerRow && playerRow.crit_used === 1;
    result.reconnectUsed = epochState.reconnect_used === 1;
    result.overloadAmpUsed = epochState.overload_amp_used === 1;
    result.raidLicense = epochState.raid_license === 1;
    result.destabilized = epochState.destabilized === 1;
    result.monetizationCosts = {
      reconnect: SKR_COSTS.reconnect,
      overloadAmplifier: SKR_COSTS.overloadAmplifier,
      raidLicense: SKR_COSTS.raidLicense,
      freeRecoveryMinutes: Math.floor(DESTABILIZE_FREE_RECOVERY_MS / 60000),
    };
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
