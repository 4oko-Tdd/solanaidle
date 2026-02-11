/**
 * Delete all player data for a wallet (character, runs, missions, guild, etc.).
 * Usage: npx tsx scripts/delete-wallet.ts <wallet_or_pattern>
 * Example: npx tsx scripts/delete-wallet.ts 4FBE%Ky1z
 */
import db from "../src/db/database.js";

const pattern = process.argv[2];
if (!pattern) {
  console.error("Usage: npx tsx scripts/delete-wallet.ts <wallet_or_pattern>");
  console.error("Example: npx tsx scripts/delete-wallet.ts 4FBE%Ky1z");
  process.exit(1);
}

// Find matching wallet(s) — support full address or SQL LIKE pattern (e.g. 4FBE%Ky1z)
const isLike = pattern.includes("%");
const rows = (
  isLike
    ? db
        .prepare(
          "SELECT id, wallet_address FROM characters WHERE wallet_address LIKE ?"
        )
        .all(pattern)
    : db
        .prepare(
          "SELECT id, wallet_address FROM characters WHERE wallet_address = ?"
        )
        .all(pattern)
) as { id: string; wallet_address: string }[];

if (rows.length === 0) {
  console.error("No character found for pattern:", pattern);
  process.exit(1);
}
if (rows.length > 1) {
  console.error("Multiple characters match. Use a more specific pattern.");
  rows.forEach((r) => console.error(" ", r.wallet_address));
  process.exit(1);
}

const wallet = rows[0].wallet_address;
const characterIds = rows.map((r) => r.id);

const runIds = db
  .prepare("SELECT id FROM weekly_runs WHERE wallet_address = ?")
  .all(wallet) as { id: string }[];

const runIdList = runIds.map((r) => r.id);

console.log("Deleting all data for wallet:", wallet);

db.exec("PRAGMA foreign_keys = OFF");
const trans = db.transaction(() => {
  if (characterIds.length) {
    db.prepare(
      "DELETE FROM raid_participants WHERE wallet_address = ?"
    ).run(wallet);
    db.prepare("DELETE FROM guild_members WHERE wallet_address = ?").run(wallet);
    db.prepare(
      "DELETE FROM active_missions WHERE character_id IN (" +
        characterIds.map(() => "?").join(",") +
        ")"
    ).run(...characterIds);
    db.prepare(
      "DELETE FROM nft_claims WHERE character_id IN (" +
        characterIds.map(() => "?").join(",") +
        ")"
    ).run(...characterIds);
    db.prepare(
      "DELETE FROM inventories WHERE character_id IN (" +
        characterIds.map(() => "?").join(",") +
        ")"
    ).run(...characterIds);
  }
  if (runIdList.length) {
    db.prepare(
      "DELETE FROM run_events WHERE run_id IN (" +
        runIdList.map(() => "?").join(",") +
        ")"
    ).run(...runIdList);
    db.prepare(
      "DELETE FROM unlocked_skills WHERE run_id IN (" +
        runIdList.map(() => "?").join(",") +
        ")"
    ).run(...runIdList);
  }
  db.prepare("DELETE FROM leaderboard WHERE wallet_address = ?").run(wallet);
  db.prepare("DELETE FROM daily_logins WHERE wallet_address = ?").run(wallet);
  db.prepare("DELETE FROM weekly_runs WHERE wallet_address = ?").run(wallet);
  db.prepare(
    "DELETE FROM characters WHERE wallet_address = ?"
  ).run(wallet);
});
trans();
db.exec("PRAGMA foreign_keys = ON");

console.log("Done. Wallet removed from database.");
