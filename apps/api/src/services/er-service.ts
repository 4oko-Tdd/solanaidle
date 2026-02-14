/**
 * Ephemeral Rollups Service
 *
 * Manages the on-chain PlayerProgress PDA via MagicBlock Ephemeral Rollups.
 * The PDA is a verifiable mirror of server-side game state:
 *
 *   Epoch start  → initialize PDA + delegate to ER (bundled with class pick tx)
 *   Mission claim → update PDA on ER (free, instant, no player signing)
 *   Epoch end    → commit + undelegate PDA back to Solana (bundled with finalize tx)
 *
 * The API server holds a server keypair for signing ER update transactions.
 * This keypair is NOT the player's wallet — it's a backend authority.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  SystemProgram,
} from "@solana/web3.js";

// ── Constants ──

const PROGRESS_PROGRAM_ID = new PublicKey(
  "PROGtrkrXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
);
const DELEGATION_PROGRAM_ID = new PublicKey(
  "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
);
const ER_ROUTER_URL =
  process.env.ER_ROUTER_URL || "https://devnet-router.magicblock.app";
const ER_VALIDATOR_URL =
  process.env.ER_VALIDATOR_URL || "https://devnet-us.magicblock.app";
const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

const PROGRESS_SEED = Buffer.from("progress");

// Class ID mapping (matches Anchor program)
const CLASS_ID_MAP: Record<string, number> = {
  scout: 0,
  guardian: 1,
  mystic: 2,
};

// ── Server Keypair ──
// In production, load from env/secret. For dev, generate ephemeral.
let serverKeypair: Keypair;
try {
  const keyStr = process.env.SERVER_KEYPAIR;
  if (keyStr) {
    serverKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(keyStr))
    );
  } else {
    serverKeypair = Keypair.generate();
    console.log(
      `[ER] Generated ephemeral server keypair: ${serverKeypair.publicKey.toBase58()}`
    );
    console.log(
      "[ER] Set SERVER_KEYPAIR env var for persistent key in production"
    );
  }
} catch {
  serverKeypair = Keypair.generate();
  console.warn("[ER] Failed to parse SERVER_KEYPAIR, using ephemeral key");
}

// ── Connections ──

const solanaConnection = new Connection(SOLANA_RPC_URL, "confirmed");
const erConnection = new Connection(ER_VALIDATOR_URL, "confirmed");

// ── PDA Derivation ──

export function deriveProgressPda(
  playerPubkey: PublicKey,
  weekStart: number
): [PublicKey, number] {
  const weekBytes = Buffer.alloc(8);
  weekBytes.writeBigInt64LE(BigInt(weekStart));

  return PublicKey.findProgramAddressSync(
    [PROGRESS_SEED, playerPubkey.toBuffer(), weekBytes],
    PROGRESS_PROGRAM_ID
  );
}

// ── Instruction Builders ──
// These build raw instructions that can be included in frontend txs
// or sent directly by the backend.

/**
 * Build the initialize_and_delegate instruction.
 * Frontend includes this in the epoch-start tx (player signs).
 */
export function buildInitializeAndDelegateIx(
  playerPubkey: PublicKey,
  weekStart: number,
  classId: string
): { instruction: TransactionInstruction; progressPda: PublicKey } {
  const [progressPda] = deriveProgressPda(playerPubkey, weekStart);
  const classIdNum = CLASS_ID_MAP[classId] ?? 0;

  // Anchor discriminator for "initialize_and_delegate"
  // sha256("global:initialize_and_delegate")[0..8]
  const discriminator = Buffer.from([
    0x5f, 0x9b, 0x3a, 0x7e, 0x12, 0xc4, 0xd8, 0x01,
  ]);

  const weekBytes = Buffer.alloc(8);
  weekBytes.writeBigInt64LE(BigInt(weekStart));

  const data = Buffer.concat([
    discriminator,
    weekBytes,
    Buffer.from([classIdNum]),
  ]);

  const keys = [
    { pubkey: playerPubkey, isSigner: true, isWritable: true },
    { pubkey: progressPda, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return {
    instruction: new TransactionInstruction({
      programId: PROGRESS_PROGRAM_ID,
      keys,
      data,
    }),
    progressPda,
  };
}

/**
 * Build the update_progress instruction.
 * Backend sends this to the ER (free, no player signing).
 */
function buildUpdateProgressIx(
  authorityPubkey: PublicKey,
  progressPda: PublicKey,
  score: number,
  missionsCompleted: number,
  deaths: number,
  bossDefeated: boolean
): TransactionInstruction {
  // Anchor discriminator for "update_progress"
  const discriminator = Buffer.from([
    0xa3, 0x2e, 0x7c, 0x1b, 0x44, 0x89, 0xf5, 0x02,
  ]);

  const data = Buffer.alloc(8 + 8 + 4 + 4 + 1);
  discriminator.copy(data, 0);
  data.writeBigUInt64LE(BigInt(score), 8);
  data.writeUInt32LE(missionsCompleted, 16);
  data.writeUInt32LE(deaths, 20);
  data.writeUInt8(bossDefeated ? 1 : 0, 24);

  const keys = [
    { pubkey: authorityPubkey, isSigner: true, isWritable: true },
    { pubkey: progressPda, isSigner: false, isWritable: true },
  ];

  return new TransactionInstruction({
    programId: PROGRESS_PROGRAM_ID,
    keys,
    data,
  });
}

/**
 * Build the finalize_and_commit instruction.
 * Frontend includes this in the epoch-end tx (player signs).
 */
export function buildFinalizeAndCommitIx(
  playerPubkey: PublicKey,
  progressPda: PublicKey,
  magicContext: PublicKey,
  magicProgram: PublicKey
): TransactionInstruction {
  // Anchor discriminator for "finalize_and_commit"
  const discriminator = Buffer.from([
    0xb7, 0x53, 0x6d, 0x91, 0x28, 0xe0, 0xaa, 0x03,
  ]);

  const keys = [
    { pubkey: playerPubkey, isSigner: true, isWritable: true },
    { pubkey: progressPda, isSigner: false, isWritable: true },
    { pubkey: magicContext, isSigner: false, isWritable: false },
    { pubkey: magicProgram, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId: PROGRESS_PROGRAM_ID,
    keys,
    data: discriminator,
  });
}

// ── Backend Operations ──

/**
 * Update the player's progress PDA on the Ephemeral Rollup.
 * Called after each mission claim. Free and instant.
 * Fails silently if ER is unavailable (game continues without on-chain mirror).
 */
export async function updateProgressOnER(
  playerWallet: string,
  weekStart: number,
  score: number,
  missionsCompleted: number,
  deaths: number,
  bossDefeated: boolean
): Promise<void> {
  try {
    const playerPubkey = new PublicKey(playerWallet);
    const [progressPda] = deriveProgressPda(playerPubkey, weekStart);

    const ix = buildUpdateProgressIx(
      serverKeypair.publicKey,
      progressPda,
      score,
      missionsCompleted,
      deaths,
      bossDefeated
    );

    const tx = new Transaction().add(ix);
    tx.feePayer = serverKeypair.publicKey;
    tx.recentBlockhash = (
      await erConnection.getLatestBlockhash()
    ).blockhash;

    const txHash = await erConnection.sendRawTransaction(
      tx.serialize(),
      { skipPreflight: true }
    );

    console.log(
      `[ER] Progress updated on ER: ${txHash} (score=${score}, missions=${missionsCompleted})`
    );
  } catch (err) {
    // Non-fatal: game continues without on-chain mirror
    console.warn("[ER] Failed to update progress on ER:", err);
  }
}

/**
 * Read the finalized progress from Solana base layer (after undelegation).
 * Used for leaderboard verification.
 */
export async function readProgressFromSolana(
  playerWallet: string,
  weekStart: number
): Promise<{
  score: number;
  missionsCompleted: number;
  deaths: number;
  bossDefeated: boolean;
} | null> {
  try {
    const playerPubkey = new PublicKey(playerWallet);
    const [progressPda] = deriveProgressPda(playerPubkey, weekStart);

    const accountInfo = await solanaConnection.getAccountInfo(progressPda);
    if (!accountInfo || !accountInfo.data) return null;

    const data = accountInfo.data;

    // Parse PlayerProgress account layout:
    // discriminator(8) + player(32) + week_start(8) + class_id(1) +
    // score(8) + missions_completed(4) + deaths(4) + boss_defeated(1) +
    // last_update(8) + bump(1)
    const offset = 8 + 32 + 8 + 1; // skip to score
    const score = Number(data.readBigUInt64LE(offset));
    const missionsCompleted = data.readUInt32LE(offset + 8);
    const deaths = data.readUInt32LE(offset + 12);
    const bossDefeated = data.readUInt8(offset + 16) === 1;

    return { score, missionsCompleted, deaths, bossDefeated };
  } catch (err) {
    console.warn("[ER] Failed to read progress from Solana:", err);
    return null;
  }
}

/**
 * Get the progress PDA address for a player + epoch.
 * Used by frontend to include in delegation/finalize txs.
 */
export function getProgressPdaAddress(
  playerWallet: string,
  weekStart: number
): string {
  const playerPubkey = new PublicKey(playerWallet);
  const [progressPda] = deriveProgressPda(playerPubkey, weekStart);
  return progressPda.toBase58();
}

// Export constants for frontend use
export const ER_CONSTANTS = {
  PROGRESS_PROGRAM_ID: PROGRESS_PROGRAM_ID.toBase58(),
  DELEGATION_PROGRAM_ID: DELEGATION_PROGRAM_ID.toBase58(),
  ER_ROUTER_URL,
  ER_VALIDATOR_URL,
};
