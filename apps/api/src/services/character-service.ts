import { randomUUID } from "crypto";
import db from "../db/database.js";
import type { Character } from "@solanaidle/shared";

interface CharacterRow {
  id: string;
  wallet_address: string;
  level: number;
  xp: number;
  hp: number;
  state: string;
  revive_at: string | null;
}

function rowToCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    level: row.level,
    xp: row.xp,
    hp: row.hp,
    state: row.state as Character["state"],
    reviveAt: row.revive_at,
  };
}

export function getCharacter(wallet: string): Character | null {
  const row = db
    .prepare("SELECT * FROM characters WHERE wallet_address = ?")
    .get(wallet) as CharacterRow | undefined;
  if (!row) return null;

  // Auto-revive if cooldown passed
  if (
    row.state === "dead" &&
    row.revive_at &&
    new Date(row.revive_at) <= new Date()
  ) {
    db.prepare(
      "UPDATE characters SET state = 'idle', revive_at = NULL WHERE id = ?"
    ).run(row.id);
    row.state = "idle";
    row.revive_at = null;
  }

  return rowToCharacter(row);
}

export function createCharacter(wallet: string): Character {
  const id = randomUUID();
  db.prepare("INSERT INTO characters (id, wallet_address) VALUES (?, ?)").run(
    id,
    wallet
  );
  db.prepare("INSERT INTO inventories (character_id) VALUES (?)").run(id);
  return getCharacter(wallet)!;
}
