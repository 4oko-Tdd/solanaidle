import db from "../db/database.js";
import crypto from "crypto";
import type { Guild, GuildMember } from "@solanaidle/shared";

const MAX_GUILD_MEMBERS = 5;

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export function createGuild(wallet: string, name: string): Guild {
  // Check if already in a guild
  const existing = getGuildByMember(wallet);
  if (existing) throw new Error("ALREADY_IN_GUILD");

  const id = crypto.randomUUID();
  const inviteCode = generateInviteCode();

  db.prepare(
    "INSERT INTO guilds (id, name, invite_code, created_by) VALUES (?, ?, ?, ?)"
  ).run(id, name, inviteCode, wallet);

  // Auto-join creator — need character_id
  const char = db
    .prepare("SELECT id FROM characters WHERE wallet_address = ?")
    .get(wallet) as any;
  if (char) {
    db.prepare(
      "INSERT INTO guild_members (guild_id, wallet_address, character_id) VALUES (?, ?, ?)"
    ).run(id, wallet, char.id);
  }

  return getGuild(id)!;
}

export function joinGuild(wallet: string, inviteCode: string): Guild {
  const existing = getGuildByMember(wallet);
  if (existing) throw new Error("ALREADY_IN_GUILD");

  const guild = db
    .prepare("SELECT * FROM guilds WHERE invite_code = ?")
    .get(inviteCode) as any;
  if (!guild) throw new Error("GUILD_NOT_FOUND");

  const memberCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM guild_members WHERE guild_id = ?"
    )
    .get(guild.id) as any;
  if (memberCount.count >= MAX_GUILD_MEMBERS) throw new Error("GUILD_FULL");

  const char = db
    .prepare("SELECT id FROM characters WHERE wallet_address = ?")
    .get(wallet) as any;
  if (!char) throw new Error("CHARACTER_NOT_FOUND");

  db.prepare(
    "INSERT INTO guild_members (guild_id, wallet_address, character_id) VALUES (?, ?, ?)"
  ).run(guild.id, wallet, char.id);

  return getGuild(guild.id)!;
}

export function leaveGuild(wallet: string): void {
  const membership = db
    .prepare(
      "SELECT guild_id FROM guild_members WHERE wallet_address = ?"
    )
    .get(wallet) as any;
  if (!membership) throw new Error("NOT_IN_GUILD");

  db.prepare(
    "DELETE FROM guild_members WHERE wallet_address = ?"
  ).run(wallet);

  // If guild is now empty, delete it
  const remaining = db
    .prepare(
      "SELECT COUNT(*) as count FROM guild_members WHERE guild_id = ?"
    )
    .get(membership.guild_id) as any;
  if (remaining.count === 0) {
    db.prepare("DELETE FROM guilds WHERE id = ?").run(membership.guild_id);
  }
}

export function getGuild(guildId: string): Guild | null {
  const row = db
    .prepare("SELECT * FROM guilds WHERE id = ?")
    .get(guildId) as any;
  if (!row) return null;
  const memberCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM guild_members WHERE guild_id = ?"
    )
    .get(guildId) as any;
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    createdBy: row.created_by,
    memberCount: memberCount.count,
  };
}

export function getGuildByMember(wallet: string): Guild | null {
  const membership = db
    .prepare(
      "SELECT guild_id FROM guild_members WHERE wallet_address = ?"
    )
    .get(wallet) as any;
  if (!membership) return null;
  return getGuild(membership.guild_id);
}

export function getGuildMembers(guildId: string): GuildMember[] {
  const rows = db
    .prepare("SELECT * FROM guild_members WHERE guild_id = ?")
    .all(guildId) as any[];
  return rows.map((r) => ({
    walletAddress: r.wallet_address,
    characterId: r.character_id,
    joinedAt: r.joined_at,
  }));
}
