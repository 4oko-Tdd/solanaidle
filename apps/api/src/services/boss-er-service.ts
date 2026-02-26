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
  SystemProgram,
} from "@solana/web3.js";
import { serverKeypair } from "./server-keypair.js";
import { getErValidatorPubkey } from "./er-constants.js";

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

// ER validator pubkey — must match ER_VALIDATOR_URL
const ER_VALIDATOR_PUBKEY = getErValidatorPubkey(ER_VALIDATOR_URL);

const ER_ROUTER_URL =
  process.env.ER_ROUTER_URL || "https://devnet-router.magicblock.app";

// ── Connections ──

const solanaConnection = new Connection(SOLANA_RPC_URL, "confirmed");
const erConnection = new Connection(ER_VALIDATOR_URL, "confirmed");
const erConnectionCache = new Map<string, Connection>();
erConnectionCache.set(ER_VALIDATOR_URL, erConnection);
const resolvedErEndpoints = new Map<string, string>(); // pdaBase58 -> fqdn URL

let erRpcRequestId = 0;

/**
 * Resolve the ER endpoint for a delegated account via the router.
 */
async function resolveErConnection(accountPda: PublicKey): Promise<Connection> {
  try {
    const pdaBase58 = accountPda.toBase58();
    const cachedEndpoint = resolvedErEndpoints.get(pdaBase58);
    if (cachedEndpoint) {
      const cachedConn = erConnectionCache.get(cachedEndpoint);
      if (cachedConn) return cachedConn;
      const conn = new Connection(cachedEndpoint, "confirmed");
      erConnectionCache.set(cachedEndpoint, conn);
      return conn;
    }

    const resp = await fetch(ER_ROUTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: ++erRpcRequestId,
        method: "getDelegationStatus",
        params: [pdaBase58],
      }),
    });
    const json = await resp.json() as { result?: { isDelegated: boolean; fqdn?: string } };
    if (json.result?.isDelegated && json.result.fqdn) {
      const url = json.result.fqdn.replace(/\/$/, "");
      resolvedErEndpoints.set(pdaBase58, url);
      if (url !== ER_VALIDATOR_URL) {
        console.log(`[BossER] PDA delegated to ${url} (not default ${ER_VALIDATOR_URL})`);
      }
      const existing = erConnectionCache.get(url);
      if (existing) return existing;
      const conn = new Connection(url, "confirmed");
      erConnectionCache.set(url, conn);
      return conn;
    }
  } catch (err) {
    console.warn("[BossER] Failed to resolve delegation endpoint:", err);
  }
  return erConnection;
}

// ── Delegation Tracking ──
const delegatedBossPdas = new Set<string>();

// ── Track last on-chain damage to compute deltas ──

const lastOnChainDamage = new Map<string, number>();
const BOSS_TOTAL_DAMAGE_OFFSET = 64; // discriminator(8) + authority(32) + week_start(8) + max_hp(8) + current_hp(8)

/**
 * Read the current total_damage from the boss PDA on ER.
 * Used to sync in-memory state after server restart.
 */
async function readTotalDamageFromER(bossPda: PublicKey): Promise<number> {
  try {
    const targetEr = await resolveErConnection(bossPda);
    const accountInfo = await targetEr.getAccountInfo(bossPda);
    if (!accountInfo?.data || accountInfo.data.length < BOSS_TOTAL_DAMAGE_OFFSET + 8) {
      return 0;
    }
    return Number(accountInfo.data.readBigUInt64LE(BOSS_TOTAL_DAMAGE_OFFSET));
  } catch {
    return 0;
  }
}

// ── PDA Derivation ──

export function deriveBossPda(weekStart: number): [PublicKey, number] {
  const weekBytes = Buffer.alloc(8);
  weekBytes.writeBigInt64LE(BigInt(weekStart));

  return PublicKey.findProgramAddressSync(
    [BOSS_SEED, weekBytes],
    BOSS_PROGRAM_ID
  );
}

// ── Delegation PDA Helpers ──

function deriveBossDelegationPdas(bossPda: PublicKey) {
  const [bufferPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("buffer"), bossPda.toBuffer()],
    BOSS_PROGRAM_ID
  );
  const [delegationRecordPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("delegation"), bossPda.toBuffer()],
    DELEGATION_PROGRAM_ID
  );
  const [delegationMetadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("delegation-metadata"), bossPda.toBuffer()],
    DELEGATION_PROGRAM_ID
  );
  return { bufferPda, delegationRecordPda, delegationMetadataPda };
}

// ── Instruction Builders ──
// Discriminators sourced from target/idl/boss_tracker.json

function buildInitializeBossIx(
  payerPubkey: PublicKey,
  weekStart: number,
  maxHp: number
): { instruction: TransactionInstruction; bossPda: PublicKey } {
  const [bossPda] = deriveBossPda(weekStart);

  // Anchor discriminator from IDL: [0x3c, 0x66, 0x9f, 0x40, 0x72, 0x33, 0xd9, 0x97]
  const discriminator = Buffer.from([0x3c, 0x66, 0x9f, 0x40, 0x72, 0x33, 0xd9, 0x97]);

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

function buildDelegateBossIx(
  payerPubkey: PublicKey,
  bossPda: PublicKey,
  weekStart: number
): TransactionInstruction {
  const { bufferPda, delegationRecordPda, delegationMetadataPda } =
    deriveBossDelegationPdas(bossPda);

  // Anchor discriminator from IDL: [0xb4, 0x0c, 0x61, 0x2e, 0x17, 0xee, 0x34, 0xdf]
  const discriminator = Buffer.from([0xb4, 0x0c, 0x61, 0x2e, 0x17, 0xee, 0x34, 0xdf]);

  const weekBytes = Buffer.alloc(8);
  weekBytes.writeBigInt64LE(BigInt(weekStart));

  const data = Buffer.concat([discriminator, weekBytes]);

  const keys = [
    { pubkey: payerPubkey, isSigner: true, isWritable: true },
    { pubkey: bufferPda, isSigner: false, isWritable: true },
    { pubkey: delegationRecordPda, isSigner: false, isWritable: true },
    { pubkey: delegationMetadataPda, isSigner: false, isWritable: true },
    { pubkey: bossPda, isSigner: false, isWritable: true }, // pda
    { pubkey: BOSS_PROGRAM_ID, isSigner: false, isWritable: false }, // owner_program
    { pubkey: DELEGATION_PROGRAM_ID, isSigner: false, isWritable: false }, // delegation_program
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    // remaining_accounts[0] = validator pubkey (routes delegation to specific ER)
    { pubkey: ER_VALIDATOR_PUBKEY, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId: BOSS_PROGRAM_ID,
    keys,
    data,
  });
}

function buildApplyDamageIx(
  authorityPubkey: PublicKey,
  bossPda: PublicKey,
  damageDelta: number,
  participantCount: number
): TransactionInstruction {
  // Anchor discriminator from IDL: [229, 25, 73, 188, 250, 95, 187, 141]
  const discriminator = Buffer.from([0xe5, 0x19, 0x49, 0xbc, 0xfa, 0x5f, 0xbb, 0x8d]);

  const data = Buffer.alloc(8 + 8 + 4);
  discriminator.copy(data, 0);
  data.writeBigUInt64LE(BigInt(damageDelta), 8);
  data.writeUInt32LE(participantCount, 16);

  const keys = [
    { pubkey: authorityPubkey, isSigner: true, isWritable: false },
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
  // Anchor discriminator from IDL: [212, 90, 133, 149, 118, 246, 105, 213]
  const discriminator = Buffer.from([0xd4, 0x5a, 0x85, 0x95, 0x76, 0xf6, 0x69, 0xd5]);

  const keys = [
    { pubkey: payerPubkey, isSigner: true, isWritable: true },
    { pubkey: bossPda, isSigner: false, isWritable: true },
    { pubkey: magicProgram, isSigner: false, isWritable: false },
    { pubkey: magicContext, isSigner: false, isWritable: true },
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
    const [bossPda] = deriveBossPda(weekStart);

    // Check if PDA already exists on base layer
    const existingAccount = await solanaConnection.getAccountInfo(bossPda);

    if (existingAccount) {
      // Check stored authority (discriminator=8, then authority=32 bytes)
      const storedAuthority = new PublicKey(existingAccount.data.slice(8, 40));
      if (!storedAuthority.equals(serverKeypair.publicKey)) {
        console.warn(
          `[BossER] Boss PDA authority mismatch — stored=${storedAuthority.toBase58()} server=${serverKeypair.publicKey.toBase58()}. Skipping ER for this boss (game continues via SQLite).`
        );
        return;
      }

      if (existingAccount.owner.equals(DELEGATION_PROGRAM_ID)) {
        // Already delegated — just mark as ready and skip
        delegatedBossPdas.add(bossPda.toBase58());
        lastOnChainDamage.set(weekStart.toString(), 0);
        console.log(
          `[BossER] Boss PDA already delegated, skipping init (pda=${bossPda.toBase58()})`
        );
        return;
      }
      if (existingAccount.owner.equals(BOSS_PROGRAM_ID)) {
        // Exists but not delegated — just delegate
        const delegateIx = buildDelegateBossIx(
          serverKeypair.publicKey,
          bossPda,
          weekStart
        );

        const tx = new Transaction().add(delegateIx);
        tx.feePayer = serverKeypair.publicKey;
        const { blockhash: bh, lastValidBlockHeight: lvbh } =
          await solanaConnection.getLatestBlockhash();
        tx.recentBlockhash = bh;
        tx.sign(serverKeypair);

        const txHash = await solanaConnection.sendRawTransaction(tx.serialize());
        const confirmation = await solanaConnection.confirmTransaction(
          { signature: txHash, blockhash: bh, lastValidBlockHeight: lvbh },
          "confirmed"
        );
        if (confirmation.value.err) {
          console.warn(`[BossER] Delegate tx failed: ${txHash}`, confirmation.value.err);
          return;
        }

        delegatedBossPdas.add(bossPda.toBase58());
        lastOnChainDamage.set(weekStart.toString(), 0);
        console.log(
          `[BossER] Boss PDA delegated (already existed): ${txHash} (pda=${bossPda.toBase58()})`
        );
        return;
      }
    }

    // PDA doesn't exist — init + delegate in one tx
    const { instruction: initIx } = buildInitializeBossIx(
      serverKeypair.publicKey,
      weekStart,
      maxHp
    );

    const delegateIx = buildDelegateBossIx(
      serverKeypair.publicKey,
      bossPda,
      weekStart
    );

    const tx = new Transaction().add(initIx).add(delegateIx);
    tx.feePayer = serverKeypair.publicKey;
    const { blockhash: bh, lastValidBlockHeight: lvbh } =
      await solanaConnection.getLatestBlockhash();
    tx.recentBlockhash = bh;
    tx.sign(serverKeypair);

    const txHash = await solanaConnection.sendRawTransaction(tx.serialize());

    const confirmation = await solanaConnection.confirmTransaction(
      { signature: txHash, blockhash: bh, lastValidBlockHeight: lvbh },
      "confirmed"
    );
    if (confirmation.value.err) {
      console.warn(`[BossER] Init+delegate tx failed on-chain: ${txHash}`, confirmation.value.err);
      return;
    }

    delegatedBossPdas.add(bossPda.toBase58());
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
  participantCount: number,
  bossMaxHp: number
): Promise<void> {
  try {
    const key = weekStart.toString();
    const [bossPda] = deriveBossPda(weekStart);

    // Lazy sync: if server restarted and in-memory map is empty,
    // read current ER total_damage to avoid re-sending stale deltas.
    if (!lastOnChainDamage.has(key)) {
      const onChainDamage = await readTotalDamageFromER(bossPda);
      lastOnChainDamage.set(key, onChainDamage);
      if (onChainDamage > 0) {
        console.log(
          `[BossER] Synced lastOnChainDamage from ER after restart: week=${weekStart}, total_damage=${onChainDamage}`
        );
      }
    }

    const lastDamage = lastOnChainDamage.get(key) ?? 0;
    const delta = totalDamageSoFar - lastDamage;

    if (delta <= 0) return; // No new damage to push

    // Auto-init+delegate if not yet done this session
    if (!delegatedBossPdas.has(bossPda.toBase58())) {
      console.log("[BossER] PDA not yet delegated, initializing first...");
      await initializeBossOnChain(weekStart, bossMaxHp);
      if (!delegatedBossPdas.has(bossPda.toBase58())) {
        console.warn("[BossER] Init+delegate failed, skipping ER update");
        return;
      }
    }

    // Resolve correct ER endpoint (PDA may be delegated to a different validator)
    const targetEr = await resolveErConnection(bossPda);

    const ix = buildApplyDamageIx(
      serverKeypair.publicKey,
      bossPda,
      delta,
      participantCount
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
      console.warn("[BossER] Simulation failed:", JSON.stringify(sim.value.err));
      if (sim.value.logs) {
        console.warn("[BossER] Logs:", sim.value.logs.join("\n"));
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
      console.warn(`[BossER] Tx failed on-chain: ${txHash}`, confirmation.value.err);
    } else {
      lastOnChainDamage.set(key, totalDamageSoFar);
      console.log(
        `[BossER] Damage confirmed on ER: ${txHash} (delta=${delta}, total=${totalDamageSoFar}, participants=${participantCount})`
      );
    }
  } catch (err) {
    console.warn("[BossER] Failed to apply damage on ER:", err);
  }
}

/**
 * Build a partially-signed apply_damage transaction for the player to countersign.
 * Server partial-signs as authority; player must sign as feePayer before sending to ER.
 * Returns null if ER is unavailable (game continues via SQLite).
 */
export async function buildPartiallySignedApplyDamageTx(
  playerWallet: string,
  weekStart: number,
  totalDamageSoFar: number,
  participantCount: number,
  bossMaxHp: number
): Promise<{ tx: string; erValidatorUrl: string } | null> {
  try {
    const key = weekStart.toString();
    const lastDamage = lastOnChainDamage.get(key) ?? 0;
    const delta = totalDamageSoFar - lastDamage;

    if (delta <= 0) return null; // No new damage to push

    const [bossPda] = deriveBossPda(weekStart);

    // Auto-init+delegate if not yet done this session
    if (!delegatedBossPdas.has(bossPda.toBase58())) {
      console.log("[BossER] PDA not yet delegated, initializing first...");
      await initializeBossOnChain(weekStart, bossMaxHp);
      if (!delegatedBossPdas.has(bossPda.toBase58())) {
        console.warn("[BossER] Init+delegate failed, cannot build partial tx");
        return null;
      }
    }

    // Resolve correct ER endpoint
    const targetEr = await resolveErConnection(bossPda);

    const ix = buildApplyDamageIx(
      serverKeypair.publicKey,
      bossPda,
      delta,
      participantCount
    );

    const tx = new Transaction().add(ix);
    tx.feePayer = new PublicKey(playerWallet);
    const { blockhash } = await targetEr.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    // Server partial-signs as authority
    tx.partialSign(serverKeypair);

    // NOTE: Do NOT update lastOnChainDamage here.
    // The caller must call applyDamageOnER() after tx confirmation,
    // or update lastOnChainDamage in a confirmed callback.
    // Updating here before confirmation can permanently skip damage
    // if the player never broadcasts the transaction.

    const serialized = tx.serialize({ requireAllSignatures: false });
    return {
      tx: serialized.toString("base64"),
      erValidatorUrl: targetEr.rpcEndpoint,
    };
  } catch (err) {
    console.warn("[BossER] Failed to build partially-signed apply damage tx:", err);
    return null;
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
      "Magic11111111111111111111111111111111111111"
    );

    // Resolve correct ER endpoint
    const targetEr = await resolveErConnection(bossPda);

    const ix = buildFinalizeAndCommitIx(
      serverKeypair.publicKey,
      bossPda,
      magicContext,
      magicProgram
    );

    const tx = new Transaction().add(ix);
    tx.feePayer = serverKeypair.publicKey;
    const { blockhash, lastValidBlockHeight } =
      await targetEr.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.sign(serverKeypair);

    const txHash = await targetEr.sendRawTransaction(
      tx.serialize(),
      { skipPreflight: true }
    );

    const confirmation = await targetEr.confirmTransaction(
      { signature: txHash, blockhash, lastValidBlockHeight },
      "confirmed"
    );

    if (confirmation.value.err) {
      console.warn(`[BossER] Finalize tx failed: ${txHash}`, confirmation.value.err);
    } else {
      // Clean up trackers
      lastOnChainDamage.delete(weekStart.toString());
      delegatedBossPdas.delete(bossPda.toBase58());
      console.log(
        `[BossER] Boss PDA finalized and committed: ${txHash}`
      );
    }
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
