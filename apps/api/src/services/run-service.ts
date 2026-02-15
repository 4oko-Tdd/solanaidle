import db from "../db/database.js";
import crypto from "crypto";
import type { WeeklyRun, ClassId } from "@solanaidle/shared";
import { RUN_LIVES } from "./game-config.js";
import { insertEvent } from "./event-service.js";
import { checkAndGrantAchievements } from "./achievement-service.js";

// Returns current week Monday 00:00 UTC -> Sunday 23:59:59 UTC
export function getWeekBounds(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sunday, 1=Monday...
  const diff = day === 0 ? -6 : 1 - day; // days to subtract to get to Monday
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff)
  );
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return {
    weekStart: monday.toISOString(),
    weekEnd: sunday.toISOString(),
  };
}

// Get active run for current week
export function getActiveRun(wallet: string): WeeklyRun | null {
  const { weekStart } = getWeekBounds();
  const row = db
    .prepare(
      "SELECT * FROM weekly_runs WHERE wallet_address = ? AND week_start = ? AND active = 1"
    )
    .get(wallet, weekStart) as any;
  if (!row) return null;
  return mapRun(row);
}

// Start a new run for the current week
export function startRun(wallet: string, classId: ClassId): WeeklyRun {
  const { weekStart, weekEnd } = getWeekBounds();
  // Check if already has a run this week
  const existing = db
    .prepare(
      "SELECT id FROM weekly_runs WHERE wallet_address = ? AND week_start = ?"
    )
    .get(wallet, weekStart);
  if (existing) throw new Error("CLASS_ALREADY_CHOSEN");

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO weekly_runs (id, wallet_address, class_id, week_start, week_end, lives_remaining)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, wallet, classId, weekStart, weekEnd, RUN_LIVES);

  // Reset resources to 0 for the new run
  const char = db.prepare("SELECT id FROM characters WHERE wallet_address = ?").get(wallet) as { id: string } | undefined;
  if (char) {
    db.prepare(
      "UPDATE inventories SET scrap = 0, crystal = 0, artifact = 0 WHERE character_id = ?"
    ).run(char.id);
    // Reset character level to 1
    db.prepare(
      "UPDATE characters SET level = 1, xp = 0 WHERE id = ?"
    ).run(char.id);
  }

  insertEvent(id, "run_start", { classId, weekNumber: getWeekNumber() });

  return getActiveRun(wallet)!;
}

// End a run (set active = 0) and write to leaderboard
export function endRun(runId: string): void {
  const run = db
    .prepare("SELECT * FROM weekly_runs WHERE id = ?")
    .get(runId) as any;
  if (!run) return;

  insertEvent(runId, "run_end", {
    finalScore: run.score,
    missionsCompleted: run.missions_completed,
    cause: "voluntary",
  });

  db.prepare("UPDATE weekly_runs SET active = 0 WHERE id = ?").run(runId);

  // Upsert leaderboard entry
  db.prepare(
    `INSERT INTO leaderboard (id, wallet_address, class_id, week_start, score, missions_completed, boss_defeated)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(wallet_address, week_start) DO UPDATE SET
       score = excluded.score,
       missions_completed = excluded.missions_completed,
       boss_defeated = excluded.boss_defeated`
  ).run(
    crypto.randomUUID(),
    run.wallet_address,
    run.class_id,
    run.week_start,
    run.score,
    run.missions_completed,
    run.boss_defeated
  );

  // Check Epoch Champion achievement (rank #1)
  const topEntry = db
    .prepare(
      "SELECT wallet_address FROM leaderboard WHERE week_start = ? ORDER BY score DESC LIMIT 1"
    )
    .get(run.week_start) as { wallet_address: string } | undefined;

  if (topEntry && topEntry.wallet_address === run.wallet_address) {
    const char = db
      .prepare("SELECT id FROM characters WHERE wallet_address = ?")
      .get(run.wallet_address) as { id: string } | undefined;
    if (char) {
      checkAndGrantAchievements(run.wallet_address, char.id, "run_end", {
        score: run.score,
        rank: 1,
      }).catch(() => {});
    }
  }
}

// Add score points to a run
export function addScore(runId: string, points: number): void {
  db.prepare("UPDATE weekly_runs SET score = score + ? WHERE id = ?").run(
    points,
    runId
  );
}

// Increment missions completed
export function incrementMissions(runId: string): void {
  db.prepare(
    "UPDATE weekly_runs SET missions_completed = missions_completed + 1 WHERE id = ?"
  ).run(runId);
}

// Mark boss as defeated
export function markBossDefeated(runId: string): void {
  db.prepare("UPDATE weekly_runs SET boss_defeated = 1 WHERE id = ?").run(
    runId
  );
}

// Use a life. Returns remaining lives. If 0, also ends the run.
export function useLife(runId: string): number {
  db.prepare(
    "UPDATE weekly_runs SET lives_remaining = lives_remaining - 1 WHERE id = ? AND lives_remaining > 0"
  ).run(runId);
  const run = db
    .prepare("SELECT lives_remaining FROM weekly_runs WHERE id = ?")
    .get(runId) as any;
  const remaining = run?.lives_remaining ?? 0;
  if (remaining <= 0) {
    endRun(runId);
  }
  return remaining;
}

// Get leaderboard for a specific week (top 20)
export function getLeaderboard(weekStart?: string) {
  const ws = weekStart || getWeekBounds().weekStart;
  const rows = db
    .prepare(
      "SELECT * FROM leaderboard WHERE week_start = ? ORDER BY score DESC LIMIT 20"
    )
    .all(ws) as any[];
  return rows.map((row, i) => ({
    rank: i + 1,
    walletAddress: row.wallet_address,
    classId: row.class_id,
    score: row.score,
    missionsCompleted: row.missions_completed,
    bossDefeated: !!row.boss_defeated,
  }));
}

export function storeStartSignature(runId: string, signature: string): void {
  db.prepare("UPDATE weekly_runs SET start_signature = ? WHERE id = ?").run(signature, runId);
}

export function storeEndSignature(runId: string, signature: string): void {
  db.prepare("UPDATE weekly_runs SET end_signature = ? WHERE id = ?").run(signature, runId);
}

export function getEndedRun(wallet: string): WeeklyRun | null {
  const { weekStart } = getWeekBounds();
  const row = db
    .prepare(
      "SELECT * FROM weekly_runs WHERE wallet_address = ? AND week_start = ? AND active = 0 ORDER BY created_at DESC LIMIT 1"
    )
    .get(wallet, weekStart) as any;
  if (!row) return null;
  return mapRun(row);
}

// Increment streak on mission success
export function incrementStreak(runId: string): number {
  db.prepare("UPDATE weekly_runs SET streak = streak + 1 WHERE id = ?").run(runId);
  const row = db.prepare("SELECT streak FROM weekly_runs WHERE id = ?").get(runId) as any;
  return row?.streak ?? 0;
}

// Reset streak on mission failure
export function resetStreak(runId: string): void {
  db.prepare("UPDATE weekly_runs SET streak = 0 WHERE id = ?").run(runId);
}

// Helper: map DB row to WeeklyRun
function mapRun(row: any): WeeklyRun {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    classId: row.class_id,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    livesRemaining: row.lives_remaining,
    score: row.score,
    missionsCompleted: row.missions_completed,
    bossDefeated: !!row.boss_defeated,
    active: !!row.active,
    streak: row.streak ?? 0,
    armorLevel: row.armor_level ?? 0,
    engineLevel: row.engine_level ?? 0,
    scannerLevel: row.scanner_level ?? 0,
    perks: [], // TODO: load from character_perks table
    startSignature: row.start_signature ?? null,
    endSignature: row.end_signature ?? null,
  };
}

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.ceil((diff / oneWeek) + 1);
}
