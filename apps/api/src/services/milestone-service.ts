import db from "../db/database.js";

type StatField = "missions_completed" | "boss_kills" | "raids_completed" | "epochs_survived";

interface LifetimeStats {
  missions_completed: number;
  boss_kills: number;
  raids_completed: number;
  epochs_survived: number;
}

// IMPORTANT: Higher-tier titles must come BEFORE lower-tier titles in the same category
// so the first matching title is the best one the player has earned.
const TITLE_TIERS = [
  { title: "Epoch Champion",   check: (s: LifetimeStats) => s.epochs_survived >= 20 },
  { title: "Season Veteran",   check: (s: LifetimeStats) => s.epochs_survived >= 5 },
  { title: "Network Ghost",    check: (s: LifetimeStats) => s.missions_completed >= 100 },
  { title: "Node Operator",    check: (s: LifetimeStats) => s.missions_completed >= 10 },
  { title: "Leviathan Hunter", check: (s: LifetimeStats) => s.boss_kills >= 10 },
  { title: "Syndicate",        check: (s: LifetimeStats) => s.raids_completed >= 10 },
];

const ALLOWED_STAT_FIELDS = new Set<StatField>([
  "missions_completed", "boss_kills", "raids_completed", "epochs_survived",
]);

export function incrementLifetimeStat(wallet: string, field: StatField, amount = 1): void {
  if (!ALLOWED_STAT_FIELDS.has(field)) throw new Error(`Invalid stat field: ${field}`);
  db.prepare(`
    INSERT INTO lifetime_stats (wallet_address, ${field}) VALUES (?, ?)
    ON CONFLICT(wallet_address) DO UPDATE SET ${field} = ${field} + ?
  `).run(wallet, amount, amount);
}

export function getPlayerTitle(wallet: string): string | null {
  const stats = db.prepare("SELECT * FROM lifetime_stats WHERE wallet_address = ?")
    .get(wallet) as LifetimeStats | undefined;
  if (!stats) return null;
  for (const tier of TITLE_TIERS) {
    if (tier.check(stats)) return tier.title;
  }
  return null;
}

export function batchGetPlayerTitles(wallets: string[]): Map<string, string> {
  if (wallets.length === 0) return new Map();
  const placeholders = wallets.map(() => "?").join(",");
  const rows = db.prepare(
    `SELECT * FROM lifetime_stats WHERE wallet_address IN (${placeholders})`
  ).all(...wallets) as (LifetimeStats & { wallet_address: string })[];
  const titles = new Map<string, string>();
  for (const row of rows) {
    for (const tier of TITLE_TIERS) {
      if (tier.check(row)) {
        titles.set(row.wallet_address, tier.title);
        break;
      }
    }
  }
  return titles;
}
