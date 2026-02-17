/**
 * Boss Ephemeral Rollups Service
 *
 * Manages the on-chain BossState PDA via MagicBlock Ephemeral Rollups.
 * One global PDA per week, seeded [b"boss", &week_start_le_bytes].
 *
 *   Boss spawn   → initialize PDA + delegate to ER
 *   Damage tick  → apply_damage on ER (free, instant)
 *   Boss dies    → commit + undelegate PDA back to Solana
 *
 * Server keypair is sole authority — same pattern as progress-tracker.
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

const BOSS_PROGRAM_ID = new PublicKey(
  "AeMcgM2YYj4fFrMGEUvPeS3YcHiaDaUeSXYXjz5382up"
);
const DELEGATION_PROGRAM_ID = new PublicKey(
  "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
);
const ER_VALIDATOR_URL =
  process.env.ER_VALIDATOR_URL || "https://devnet-us.magicblock.app";
const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

const BOSS_SEED = Buffer.from("boss");

// ── Server Keypair ──
// Reuse the same server keypair as er-service.ts
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
      `[BossER] Generated ephemeral server keypair: ${serverKeypair.publicKey.toBase58()}`
    );
    console.log(
      "[BossER] Set SERVER_KEYPAIR env var for persistent key in production"
    );
  }
} catch {
  serverKeypair = Keypair.generate();
  console.warn("[BossER] Failed to parse SERVER_KEYPAIR, using ephemeral key");
}

// ── Connections ──

const solanaConnection = new Connection(SOLANA_RPC_URL, "confirmed");
const erConnection = new Connection(ER_VALIDATOR_URL, "confirmed");

// ── Track last on-chain damage to compute deltas ──

const lastOnChainDamage = new Map<string, number>();

// ── PDA Derivation ──

export function deriveBossPda(weekStart: number): [PublicKey, number] {
  const weekBytes = Buffer.alloc(8);
  weekBytes.writeBigInt64LE(BigInt(weekStart));

  return PublicKey.findProgramAddressSync(
    [BOSS_SEED, weekBytes],
    BOSS_PROGRAM_ID
  );
}

// ── Instruction Builders ──

function buildInitializeAndDelegateIx(
  payerPubkey: PublicKey,
  weekStart: number,
  maxHp: number
): { instruction: TransactionInstruction; bossPda: PublicKey } {
  const [bossPda] = deriveBossPda(weekStart);

  // Anchor discriminator for "initialize_and_delegate"
  // sha256("global:initialize_and_delegate")[0..8]
  const discriminator = Buffer.from([
    0x5f, 0x9b, 0x3a, 0x7e, 0x12, 0xc4, 0xd8, 0x01,
  ]);

  const weekBytes = Buffer.alloc(8);
  weekBytes.writeBigInt64LE(BigInt(weekStart));

  const maxHpBytes = Buffer.alloc(8);
  maxHpBytes.writeBigUInt64LE(BigInt(maxHp));

  const data = Buffer.concat([discriminator, weekBytes, maxHpBytes]);

  const keys = [
    { pubkey: payerPubkey, isSigner: true, isWritable: true },
    { pubkey: bossPda, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return {
    instruction: new TransactionInstruction({
      programId: BOSS_PROGRAM_ID,
      keys,
      data,
    }),
    bossPda,
  };
}

function buildApplyDamageIx(
  authorityPubkey: PublicKey,
  bossPda: PublicKey,
  damageDelta: number,
  participantCount: number
): TransactionInstruction {
  // Anchor discriminator for "apply_damage"
  const discriminator = Buffer.from([
    0xc2, 0x4a, 0x15, 0x8d, 0x37, 0xb6, 0xe9, 0x04,
  ]);

  const data = Buffer.alloc(8 + 8 + 4);
  discriminator.copy(data, 0);
  data.writeBigUInt64LE(BigInt(damageDelta), 8);
  data.writeUInt32LE(participantCount, 16);

  const keys = [
    { pubkey: authorityPubkey, isSigner: true, isWritable: true },
    { pubkey: bossPda, isSigner: false, isWritable: true },
  ];

  return new TransactionInstruction({
    programId: BOSS_PROGRAM_ID,
    keys,
    data,
  });
}

function buildFinalizeAndCommitIx(
  payerPubkey: PublicKey,
  bossPda: PublicKey,
  magicContext: PublicKey,
  magicProgram: PublicKey
): TransactionInstruction {
  // Anchor discriminator for "finalize_and_commit"
  const discriminator = Buffer.from([
    0xb7, 0x53, 0x6d, 0x91, 0x28, 0xe0, 0xaa, 0x03,
  ]);

  const keys = [
    { pubkey: payerPubkey, isSigner: true, isWritable: true },
    { pubkey: bossPda, isSigner: false, isWritable: true },
    { pubkey: magicContext, isSigner: false, isWritable: false },
    { pubkey: magicProgram, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId: BOSS_PROGRAM_ID,
    keys,
    data: discriminator,
  });
}

// ── Backend Operations ──

/**
 * Initialize the boss PDA on-chain and delegate to ER.
 * Called at boss spawn (Saturday 00:00 UTC).
 */
export async function initializeBossOnChain(
  weekStart: number,
  maxHp: number
): Promise<void> {
  try {
    const { instruction, bossPda } = buildInitializeAndDelegateIx(
      serverKeypair.publicKey,
      weekStart,
      maxHp
    );

    const tx = new Transaction().add(instruction);
    tx.feePayer = serverKeypair.publicKey;
    tx.recentBlockhash = (
      await solanaConnection.getLatestBlockhash()
    ).blockhash;
    tx.sign(serverKeypair);

    const txHash = await solanaConnection.sendRawTransaction(
      tx.serialize(),
      { skipPreflight: true }
    );

    // Reset damage tracker for this week
    lastOnChainDamage.set(weekStart.toString(), 0);

    console.log(
      `[BossER] Boss PDA initialized and delegated: ${txHash} (pda=${bossPda.toBase58()}, maxHp=${maxHp})`
    );
  } catch (err) {
    console.warn("[BossER] Failed to initialize boss on-chain:", err);
  }
}

/**
 * Apply damage delta to the boss PDA on the ER.
 * Called after passive damage recalc or OVERLOAD.
 */
export async function applyDamageOnER(
  weekStart: number,
  totalDamageSoFar: number,
  participantCount: number
): Promise<void> {
  try {
    const key = weekStart.toString();
    const lastDamage = lastOnChainDamage.get(key) ?? 0;
    const delta = totalDamageSoFar - lastDamage;

    if (delta <= 0) return; // No new damage to push

    const [bossPda] = deriveBossPda(weekStart);

    const ix = buildApplyDamageIx(
      serverKeypair.publicKey,
      bossPda,
      delta,
      participantCount
    );

    const tx = new Transaction().add(ix);
    tx.feePayer = serverKeypair.publicKey;
    tx.recentBlockhash = (
      await erConnection.getLatestBlockhash()
    ).blockhash;
    tx.sign(serverKeypair);

    const txHash = await erConnection.sendRawTransaction(
      tx.serialize(),
      { skipPreflight: true }
    );

    lastOnChainDamage.set(key, totalDamageSoFar);

    console.log(
      `[BossER] Damage applied on ER: ${txHash} (delta=${delta}, total=${totalDamageSoFar}, participants=${participantCount})`
    );
  } catch (err) {
    console.warn("[BossER] Failed to apply damage on ER:", err);
  }
}

/**
 * Commit the boss PDA back to Solana base layer and undelegate.
 * Called when boss dies or weekend ends.
 */
export async function finalizeBossOnChain(weekStart: number): Promise<void> {
  try {
    const [bossPda] = deriveBossPda(weekStart);

    // MagicBlock magic context and program addresses
    const magicContext = new PublicKey(
      "MagicContext1111111111111111111111111111111"
    );
    const magicProgram = new PublicKey(
      "MagicProgram111111111111111111111111111111"
    );

    const ix = buildFinalizeAndCommitIx(
      serverKeypair.publicKey,
      bossPda,
      magicContext,
      magicProgram
    );

    const tx = new Transaction().add(ix);
    tx.feePayer = serverKeypair.publicKey;
    tx.recentBlockhash = (
      await erConnection.getLatestBlockhash()
    ).blockhash;
    tx.sign(serverKeypair);

    const txHash = await erConnection.sendRawTransaction(
      tx.serialize(),
      { skipPreflight: true }
    );

    // Clean up damage tracker
    lastOnChainDamage.delete(weekStart.toString());

    console.log(
      `[BossER] Boss PDA finalized and committed: ${txHash}`
    );
  } catch (err) {
    console.warn("[BossER] Failed to finalize boss on-chain:", err);
  }
}

/**
 * Get the boss PDA address for a given week.
 * Used by frontend for websocket subscription.
 */
export function getBossPdaAddress(weekStart: number): string {
  const [bossPda] = deriveBossPda(weekStart);
  return bossPda.toBase58();
}

// Export constants for frontend use
export const BOSS_ER_CONSTANTS = {
  BOSS_PROGRAM_ID: BOSS_PROGRAM_ID.toBase58(),
  ER_VALIDATOR_URL,
};
