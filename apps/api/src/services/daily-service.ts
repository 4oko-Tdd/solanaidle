import db from "../db/database.js";
import type { DailyReward, DailyLoginStatus } from "@solanaidle/shared";

const DAILY_REWARDS: DailyReward[] = [
  { day: 1, scrap: 15, crystal: 0, artifact: 0 },
  { day: 2, scrap: 25, crystal: 0, artifact: 0 },
  { day: 3, scrap: 10, crystal: 3, artifact: 0 },
  { day: 4, scrap: 30, crystal: 5, artifact: 0 },
  { day: 5, scrap: 20, crystal: 10, artifact: 0 },
  { day: 6, scrap: 40, crystal: 15, artifact: 0 },
  { day: 7, scrap: 50, crystal: 20, artifact: 1 },
];

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function getYesterdayUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

interface DailyRow {
  wallet_address: string;
  streak_day: number;
  last_claim_date: string;
}

export function getDailyStatus(wallet: string): DailyLoginStatus {
  const row = db
    .prepare("SELECT * FROM daily_logins WHERE wallet_address = ?")
    .get(wallet) as DailyRow | undefined;

  const today = getTodayUTC();

  if (!row) {
    return {
      streakDay: 1,
      claimedToday: false,
      todayReward: DAILY_REWARDS[0],
      rewards: DAILY_REWARDS,
    };
  }

  const claimedToday = row.last_claim_date === today;
  let streakDay = row.streak_day;

  if (!claimedToday && row.last_claim_date !== getYesterdayUTC()) {
    streakDay = 1;
  }

  return {
    streakDay,
    claimedToday,
    todayReward: DAILY_REWARDS[streakDay - 1],
    rewards: DAILY_REWARDS,
  };
}

export function claimDaily(
  wallet: string,
  characterId: string
): { reward: DailyReward; newStreakDay: number } {
  const today = getTodayUTC();
  const yesterday = getYesterdayUTC();

  const row = db
    .prepare("SELECT * FROM daily_logins WHERE wallet_address = ?")
    .get(wallet) as DailyRow | undefined;

  if (row && row.last_claim_date === today) {
    throw new Error("ALREADY_CLAIMED_TODAY");
  }

  let streakDay: number;
  if (!row) {
    streakDay = 1;
    db.prepare(
      "INSERT INTO daily_logins (wallet_address, streak_day, last_claim_date) VALUES (?, ?, ?)"
    ).run(wallet, 1, today);
  } else if (row.last_claim_date === yesterday) {
    streakDay = row.streak_day >= 7 ? 1 : row.streak_day + 1;
    db.prepare(
      "UPDATE daily_logins SET streak_day = ?, last_claim_date = ? WHERE wallet_address = ?"
    ).run(streakDay, today, wallet);
  } else {
    streakDay = 1;
    db.prepare(
      "UPDATE daily_logins SET streak_day = 1, last_claim_date = ? WHERE wallet_address = ?"
    ).run(today, wallet);
  }

  const reward = DAILY_REWARDS[streakDay - 1];

  db.prepare(
    "UPDATE inventories SET scrap = scrap + ?, crystal = crystal + ?, artifact = artifact + ? WHERE character_id = ?"
  ).run(reward.scrap, reward.crystal, reward.artifact, characterId);

  return { reward, newStreakDay: streakDay };
}
