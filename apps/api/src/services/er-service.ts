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
  "8umphbZnJMMVNqR5QnaMurNCf6TcpbgQV5CWKKbChzcL"
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

// ER validator pubkeys — must match ER_VALIDATOR_URL
// See https://docs.magicblock.gg/pages/get-started/how-integrate-your-program/local-setup
const ER_VALIDATOR_MAP: Record<string, string> = {
  "https://devnet-us.magicblock.app": "MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd",
  "https://devnet-eu.magicblock.app": "MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e",
  "https://devnet-as.magicblock.app": "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57",
  "https://us.magicblock.app": "MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd",
  "https://eu.magicblock.app": "MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e",
  "https://as.magicblock.app": "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57",
};
const ER_VALIDATOR_PUBKEY = new PublicKey(
  ER_VALIDATOR_MAP[ER_VALIDATOR_URL] || "MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd"
);

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

/**
 * Resolve the ER endpoint for a delegated account via the router.
 * Returns a Connection to the correct ER validator, or falls back to default.
 */
async function resolveErConnection(accountPda: PublicKey): Promise<Connection> {
  try {
    const resp = await fetch(ER_ROUTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getDelegationStatus",
        params: [accountPda.toBase58()],
      }),
    });
    const json = await resp.json() as { result?: { isDelegated: boolean; fqdn?: string } };
    if (json.result?.isDelegated && json.result.fqdn) {
      const url = json.result.fqdn.replace(/\/$/, "");
      if (url !== ER_VALIDATOR_URL) {
        console.log(`[ER] PDA delegated to ${url} (not default ${ER_VALIDATOR_URL})`);
      }
      return new Connection(url, "confirmed");
    }
  } catch (err) {
    console.warn("[ER] Failed to resolve delegation endpoint:", err);
  }
  return erConnection;
}

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

// ── Delegation PDA Helpers ──

/**
 * Derive the delegation-related PDAs that the #[delegate] macro requires.
 * These are needed for the initialize_and_delegate instruction.
 */
function deriveDelegationPdas(accountPda: PublicKey) {
  // buffer PDA: seeds ["buffer", accountPda] under the owner program
  const [bufferPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("buffer"), accountPda.toBuffer()],
    PROGRESS_PROGRAM_ID
  );

  // delegation record PDA: seeds ["delegation", accountPda] under delegation program
  const [delegationRecordPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("delegation"), accountPda.toBuffer()],
    DELEGATION_PROGRAM_ID
  );

  // delegation metadata PDA: seeds ["delegation-metadata", accountPda] under delegation program
  const [delegationMetadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("delegation-metadata"), accountPda.toBuffer()],
    DELEGATION_PROGRAM_ID
  );

  return { bufferPda, delegationRecordPda, delegationMetadataPda };
}

// ── Instruction Builders ──
// Discriminators sourced from target/idl/progress_tracker.json

/**
 * Build the initialize_progress instruction (base layer only, no delegation).
 * IDL accounts: payer, player, progress, system_program
 */
function buildInitializeProgressIx(
  payerPubkey: PublicKey,
  playerPubkey: PublicKey,
  weekStart: number,
  classId: string
): { instruction: TransactionInstruction; progressPda: PublicKey } {
  const [progressPda] = deriveProgressPda(playerPubkey, weekStart);
  const classIdNum = CLASS_ID_MAP[classId] ?? 0;

  // Anchor discriminator from IDL: [30, 7, 166, 79, 156, 245, 40, 24]
  const discriminator = Buffer.from([0x1e, 0x07, 0xa6, 0x4f, 0x9c, 0xf5, 0x28, 0x18]);

  const weekBytes = Buffer.alloc(8);
  weekBytes.writeBigInt64LE(BigInt(weekStart));

  const data = Buffer.concat([
    discriminator,
    weekBytes,
    Buffer.from([classIdNum]),
  ]);

  const keys = [
    { pubkey: payerPubkey, isSigner: true, isWritable: true },
    { pubkey: playerPubkey, isSigner: false, isWritable: false },
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
 * Build the delegate_progress instruction (delegates PDA to ER).
 * IDL accounts: payer, player, buffer_pda, delegation_record_pda,
 *   delegation_metadata_pda, pda, owner_program, delegation_program, system_program
 */
function buildDelegateProgressIx(
  payerPubkey: PublicKey,
  playerPubkey: PublicKey,
  progressPda: PublicKey,
  weekStart: number
): TransactionInstruction {
  const { bufferPda, delegationRecordPda, delegationMetadataPda } =
    deriveDelegationPdas(progressPda);

  // Anchor discriminator from IDL: [225, 17, 46, 156, 91, 130, 210, 54]
  const discriminator = Buffer.from([0xe1, 0x11, 0x2e, 0x9c, 0x5b, 0x82, 0xd2, 0x36]);

  const weekBytes = Buffer.alloc(8);
  weekBytes.writeBigInt64LE(BigInt(weekStart));

  const data = Buffer.concat([discriminator, weekBytes]);

  // Account order must match IDL exactly
  const keys = [
    { pubkey: payerPubkey, isSigner: true, isWritable: true },
    { pubkey: playerPubkey, isSigner: false, isWritable: false },
    { pubkey: bufferPda, isSigner: false, isWritable: true },
    { pubkey: delegationRecordPda, isSigner: false, isWritable: true },
    { pubkey: delegationMetadataPda, isSigner: false, isWritable: true },
    { pubkey: progressPda, isSigner: false, isWritable: true }, // pda
    { pubkey: PROGRESS_PROGRAM_ID, isSigner: false, isWritable: false }, // owner_program
    { pubkey: DELEGATION_PROGRAM_ID, isSigner: false, isWritable: false }, // delegation_program
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    // remaining_accounts[0] = validator pubkey (routes delegation to specific ER)
    { pubkey: ER_VALIDATOR_PUBKEY, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId: PROGRESS_PROGRAM_ID,
    keys,
    data,
  });
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
  // Anchor discriminator from IDL: [135, 47, 78, 113, 27, 158, 21, 111]
  const discriminator = Buffer.from([0x87, 0x2f, 0x4e, 0x71, 0x1b, 0x9e, 0x15, 0x6f]);

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
  // Anchor discriminator from IDL: [212, 90, 133, 149, 118, 246, 105, 213]
  const discriminator = Buffer.from([0xd4, 0x5a, 0x85, 0x95, 0x76, 0xf6, 0x69, 0xd5]);

  const keys = [
    { pubkey: playerPubkey, isSigner: true, isWritable: true },
    { pubkey: progressPda, isSigner: false, isWritable: true },
    { pubkey: magicProgram, isSigner: false, isWritable: false },
    { pubkey: magicContext, isSigner: false, isWritable: true },
  ];

  return new TransactionInstruction({
    programId: PROGRESS_PROGRAM_ID,
    keys,
    data: discriminator,
  });
}

// ── Delegation Tracking ──
// Track which PDAs have been initialized+delegated this session
const delegatedPdas = new Set<string>();

// ── Backend Operations ──

/**
 * Initialize the player's progress PDA on Solana base layer and delegate to ER.
 * Called when a new run starts. Server keypair pays rent.
 * Follows the same pattern as initializeBossOnChain in boss-er-service.
 */
export async function initializeProgressOnChain(
  playerWallet: string,
  weekStart: number,
  classId: string
): Promise<void> {
  try {
    const playerPubkey = new PublicKey(playerWallet);
    const [progressPda] = deriveProgressPda(playerPubkey, weekStart);

    // Check if PDA already exists on base layer
    const existingAccount = await solanaConnection.getAccountInfo(progressPda);

    if (existingAccount) {
      if (existingAccount.owner.equals(DELEGATION_PROGRAM_ID)) {
        // Already delegated — just mark as ready and skip
        delegatedPdas.add(progressPda.toBase58());
        console.log(
          `[ER] Progress PDA already delegated, skipping init (pda=${progressPda.toBase58()})`
        );
        return;
      }
      if (existingAccount.owner.equals(PROGRESS_PROGRAM_ID)) {
        // Exists but not delegated — just delegate
        const delegateIx = buildDelegateProgressIx(
          serverKeypair.publicKey,
          playerPubkey,
          progressPda,
          weekStart
        );

        const tx = new Transaction().add(delegateIx);
        tx.feePayer = serverKeypair.publicKey;
        tx.recentBlockhash = (
          await solanaConnection.getLatestBlockhash()
        ).blockhash;
        tx.sign(serverKeypair);

        const txHash = await solanaConnection.sendRawTransaction(tx.serialize());
        const confirmation = await solanaConnection.confirmTransaction(txHash, "confirmed");
        if (confirmation.value.err) {
          console.warn(`[ER] Delegate tx failed: ${txHash}`, confirmation.value.err);
          return;
        }

        delegatedPdas.add(progressPda.toBase58());
        console.log(
          `[ER] Progress PDA delegated (already existed): ${txHash} (pda=${progressPda.toBase58()})`
        );
        return;
      }
    }

    // PDA doesn't exist — init + delegate in one tx
    const { instruction: initIx } = buildInitializeProgressIx(
      serverKeypair.publicKey,
      playerPubkey,
      weekStart,
      classId
    );

    const delegateIx = buildDelegateProgressIx(
      serverKeypair.publicKey,
      playerPubkey,
      progressPda,
      weekStart
    );

    const tx = new Transaction().add(initIx).add(delegateIx);
    tx.feePayer = serverKeypair.publicKey;
    tx.recentBlockhash = (
      await solanaConnection.getLatestBlockhash()
    ).blockhash;
    tx.sign(serverKeypair);

    const txHash = await solanaConnection.sendRawTransaction(tx.serialize());

    const confirmation = await solanaConnection.confirmTransaction(txHash, "confirmed");
    if (confirmation.value.err) {
      console.warn(`[ER] Init+delegate tx failed on-chain: ${txHash}`, confirmation.value.err);
      return;
    }

    delegatedPdas.add(progressPda.toBase58());

    console.log(
      `[ER] Progress PDA initialized and delegated: ${txHash} (player=${playerWallet}, pda=${progressPda.toBase58()}, week=${weekStart})`
    );
  } catch (err) {
    // Non-fatal: game continues without on-chain mirror
    console.warn("[ER] Failed to initialize progress on-chain:", err);
  }
}

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

    // Auto-init+delegate if not yet done this session
    if (!delegatedPdas.has(progressPda.toBase58())) {
      console.log("[ER] PDA not yet delegated, initializing first...");
      await initializeProgressOnChain(playerWallet, weekStart, "scout");
      if (!delegatedPdas.has(progressPda.toBase58())) {
        console.warn("[ER] Init+delegate failed, skipping ER update");
        return;
      }
    }

    // Resolve correct ER endpoint (PDA may be delegated to a different validator)
    const targetEr = await resolveErConnection(progressPda);

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
    const { blockhash, lastValidBlockHeight } =
      await targetEr.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.sign(serverKeypair);

    // Simulate first to catch errors before sending
    const sim = await targetEr.simulateTransaction(tx);
    if (sim.value.err) {
      console.warn("[ER] Simulation failed:", JSON.stringify(sim.value.err));
      if (sim.value.logs) {
        console.warn("[ER] Logs:", sim.value.logs.join("\n"));
      }
      return;
    }

    const txHash = await targetEr.sendRawTransaction(
      tx.serialize(),
      { skipPreflight: true }
    );

    // Confirm the transaction actually landed
    const confirmation = await targetEr.confirmTransaction(
      { signature: txHash, blockhash, lastValidBlockHeight },
      "confirmed"
    );

    if (confirmation.value.err) {
      console.warn(`[ER] Tx failed on-chain: ${txHash}`, confirmation.value.err);
    } else {
      console.log(
        `[ER] Progress confirmed on ER: ${txHash} (score=${score}, missions=${missionsCompleted})`
      );
    }
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
