/**
 * Verify ER PDAs — reads boss and progress PDAs from the ER and decodes them.
 *
 * Usage:
 *   npx tsx scripts/verify-er.ts [playerWallet]
 */

import { Connection, PublicKey } from "@solana/web3.js";

const BOSS_PROGRAM_ID = new PublicKey("AeMcgM2YYj4fFrMGEUvPeS3YcHiaDaUeSXYXjz5382up");
const PROGRESS_PROGRAM_ID = new PublicKey("8umphbZnJMMVNqR5QnaMurNCf6TcpbgQV5CWKKbChzcL");
const DELEGATION_PROGRAM_ID = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");
const ER_ROUTER_URL = process.env.ER_ROUTER_URL || "https://devnet-router.magicblock.app";
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

const solana = new Connection(SOLANA_RPC_URL, "confirmed");

// ── PDA derivation ──

function deriveBossPda(weekStart: number): PublicKey {
  const weekBytes = Buffer.alloc(8);
  weekBytes.writeBigInt64LE(BigInt(weekStart));
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("boss"), weekBytes],
    BOSS_PROGRAM_ID
  );
  return pda;
}

function deriveProgressPda(player: PublicKey, weekStart: number): PublicKey {
  const weekBytes = Buffer.alloc(8);
  weekBytes.writeBigInt64LE(BigInt(weekStart));
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("progress"), player.toBuffer(), weekBytes],
    PROGRESS_PROGRAM_ID
  );
  return pda;
}

// ── Router lookup ──

async function getDelegationInfo(pda: PublicKey): Promise<{ isDelegated: boolean; fqdn?: string }> {
  const resp = await fetch(ER_ROUTER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1,
      method: "getDelegationStatus",
      params: [pda.toBase58()],
    }),
  });
  const json = await resp.json() as { result?: { isDelegated: boolean; fqdn?: string } };
  return json.result ?? { isDelegated: false };
}

// ── Account readers ──

async function readAccountFromEr(pda: PublicKey, fqdn: string): Promise<Buffer | null> {
  const erConn = new Connection(fqdn.replace(/\/$/, ""), "confirmed");
  const info = await erConn.getAccountInfo(pda);
  if (!info) return null;
  return Buffer.from(info.data);
}

// ── Decoders ──

function decodeBossState(data: Buffer) {
  // 8-byte discriminator, then fields
  let offset = 8;
  const authority = new PublicKey(data.subarray(offset, offset + 32)).toBase58(); offset += 32;
  const weekStart = Number(data.readBigInt64LE(offset)); offset += 8;
  const maxHp = Number(data.readBigUInt64LE(offset)); offset += 8;
  const currentHp = Number(data.readBigUInt64LE(offset)); offset += 8;
  const totalDamage = Number(data.readBigUInt64LE(offset)); offset += 8;
  const participantCount = data.readUInt32LE(offset); offset += 4;
  const killed = data.readUInt8(offset) !== 0; offset += 1;
  const spawnedAt = Number(data.readBigInt64LE(offset)); offset += 8;
  const bump = data.readUInt8(offset);

  return { authority, weekStart, maxHp, currentHp, totalDamage, participantCount, killed, spawnedAt: new Date(spawnedAt * 1000).toISOString(), bump };
}

function decodeProgressState(data: Buffer) {
  let offset = 8;
  const player = new PublicKey(data.subarray(offset, offset + 32)).toBase58(); offset += 32;
  const weekStart = Number(data.readBigInt64LE(offset)); offset += 8;
  const classId = data.readUInt8(offset); offset += 1;
  const score = Number(data.readBigUInt64LE(offset)); offset += 8;
  const missionsCompleted = data.readUInt32LE(offset); offset += 4;
  const deaths = data.readUInt32LE(offset); offset += 4;
  const bossDefeated = data.readUInt8(offset) !== 0; offset += 1;
  const lastUpdate = Number(data.readBigInt64LE(offset)); offset += 8;
  const bump = data.readUInt8(offset);

  const classNames = ["scout", "guardian", "mystic"];
  return { player, weekStart, class: classNames[classId] ?? classId, score, missionsCompleted, deaths, bossDefeated, lastUpdate: new Date(lastUpdate * 1000).toISOString(), bump };
}

// ── Main ──

async function main() {
  const playerWallet = process.argv[2];

  // Current week start (Monday 00:00 UTC)
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  const weekStart = Math.floor(monday.getTime() / 1000);

  console.log(`\n=== ER Verification ===`);
  console.log(`Week start: ${weekStart} (${monday.toISOString()})\n`);

  // ── Boss PDA ──
  const bossPda = deriveBossPda(weekStart);
  console.log(`--- Boss PDA ---`);
  console.log(`Address: ${bossPda.toBase58()}`);

  const bossBaseInfo = await solana.getAccountInfo(bossPda);
  if (bossBaseInfo) {
    console.log(`Base layer: exists, owner=${bossBaseInfo.owner.toBase58()}`);
    if (bossBaseInfo.owner.equals(DELEGATION_PROGRAM_ID)) {
      console.log(`Status: DELEGATED to ER`);
    }
  } else {
    console.log(`Base layer: does not exist`);
  }

  const bossDelegation = await getDelegationInfo(bossPda);
  console.log(`Router: isDelegated=${bossDelegation.isDelegated}, fqdn=${bossDelegation.fqdn ?? "none"}`);

  if (bossDelegation.isDelegated && bossDelegation.fqdn) {
    const data = await readAccountFromEr(bossPda, bossDelegation.fqdn);
    if (data) {
      console.log(`ER data (${data.length} bytes):`);
      console.log(decodeBossState(data));
    } else {
      console.log(`ER: account not found on ${bossDelegation.fqdn}`);
    }
  }

  // ── Progress PDA ──
  if (playerWallet) {
    const playerPubkey = new PublicKey(playerWallet);
    const progressPda = deriveProgressPda(playerPubkey, weekStart);

    console.log(`\n--- Progress PDA (${playerWallet.slice(0, 8)}...) ---`);
    console.log(`Address: ${progressPda.toBase58()}`);

    const progressBaseInfo = await solana.getAccountInfo(progressPda);
    if (progressBaseInfo) {
      console.log(`Base layer: exists, owner=${progressBaseInfo.owner.toBase58()}`);
      if (progressBaseInfo.owner.equals(DELEGATION_PROGRAM_ID)) {
        console.log(`Status: DELEGATED to ER`);
      }
    } else {
      console.log(`Base layer: does not exist`);
    }

    const progressDelegation = await getDelegationInfo(progressPda);
    console.log(`Router: isDelegated=${progressDelegation.isDelegated}, fqdn=${progressDelegation.fqdn ?? "none"}`);

    if (progressDelegation.isDelegated && progressDelegation.fqdn) {
      const data = await readAccountFromEr(progressPda, progressDelegation.fqdn);
      if (data) {
        console.log(`ER data (${data.length} bytes):`);
        console.log(decodeProgressState(data));
      } else {
        console.log(`ER: account not found on ${progressDelegation.fqdn}`);
      }
    }
  } else {
    console.log(`\nSkipping progress check — pass a player wallet as argument:`);
    console.log(`  npx tsx scripts/verify-er.ts <PLAYER_WALLET>`);
  }

  console.log();
}

main().catch(console.error);
