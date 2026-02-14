import { Connection, PublicKey } from "@solana/web3.js";
import db from "../db/database.js";
import { getRandomLootItemId, getRandomTier2ItemId, addLoot } from "./loot-service.js";
import type { EpochBonusRewards, WeeklyRun } from "@solanaidle/shared";

// Program ID — update after deploying vrf-roller to devnet
const VRF_ROLLER_PROGRAM_ID = new PublicKey(
  "3khuFQS11YeGuUUhoxLmz6fPi9Dsu6FahXLyGrzpbhUt"
);

const VRF_RESULT_SEED = Buffer.from("vrf_result");

// Account layout offsets (after 8-byte Anchor discriminator):
// player:     32 bytes (offset 8)
// randomness: 32 bytes (offset 40)
// status:      1 byte  (offset 72)
// created_at:  8 bytes (offset 73)
// bump:        1 byte  (offset 81)
const DISCRIMINATOR_SIZE = 8;
const PLAYER_OFFSET = DISCRIMINATOR_SIZE;
const RANDOMNESS_OFFSET = PLAYER_OFFSET + 32;
const STATUS_OFFSET = RANDOMNESS_OFFSET + 32;
const CREATED_AT_OFFSET = STATUS_OFFSET + 1;

const STATUS_FULFILLED = 1;
const MAX_AGE_SECONDS = 300; // 5 minutes

// Solana RPC connection (devnet for hackathon)
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

// Track consumed VRF accounts to prevent reuse
const consumedVrfAccounts = new Set<string>();

export interface VrfResultData {
  player: string;
  randomness: Uint8Array;
  status: number;
  createdAt: number;
}

/**
 * Derive the VRF result PDA for a given player wallet.
 */
export function deriveVrfResultPda(playerPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VRF_RESULT_SEED, playerPubkey.toBuffer()],
    VRF_ROLLER_PROGRAM_ID
  );
}

/**
 * Read the VrfResult account from Solana.
 */
export async function readVrfResult(
  vrfAccountPubkey: PublicKey
): Promise<VrfResultData | null> {
  const accountInfo = await connection.getAccountInfo(vrfAccountPubkey);
  if (!accountInfo || !accountInfo.data) return null;

  const data = accountInfo.data;

  const player = new PublicKey(data.subarray(PLAYER_OFFSET, PLAYER_OFFSET + 32));
  const randomness = data.subarray(RANDOMNESS_OFFSET, RANDOMNESS_OFFSET + 32);
  const status = data[STATUS_OFFSET];
  const createdAtBigInt = data.readBigInt64LE(CREATED_AT_OFFSET);
  const createdAt = Number(createdAtBigInt);

  return {
    player: player.toBase58(),
    randomness: new Uint8Array(randomness),
    status,
    createdAt,
  };
}

/**
 * Validate a VRF result: correct player, fulfilled, fresh, not reused.
 */
export function validateVrfResult(
  result: VrfResultData,
  expectedWallet: string
): { valid: boolean; error?: string } {
  if (result.player !== expectedWallet) {
    return { valid: false, error: "VRF result belongs to different player" };
  }

  if (result.status !== STATUS_FULFILLED) {
    return { valid: false, error: "VRF result not yet fulfilled" };
  }

  const nowUnix = Math.floor(Date.now() / 1000);
  if (nowUnix - result.createdAt > MAX_AGE_SECONDS) {
    return { valid: false, error: "VRF result expired (>5 min old)" };
  }

  return { valid: true };
}

/**
 * Mark a VRF account as consumed (prevent reuse).
 */
export function markVrfConsumed(vrfAccountKey: string): boolean {
  if (consumedVrfAccounts.has(vrfAccountKey)) {
    return false; // already consumed
  }
  consumedVrfAccounts.add(vrfAccountKey);

  // Clean old entries periodically (keep set from growing forever)
  if (consumedVrfAccounts.size > 10000) {
    const entries = Array.from(consumedVrfAccounts);
    entries.slice(0, 5000).forEach((e) => consumedVrfAccounts.delete(e));
  }

  return true;
}

/**
 * Map a random byte (0-255) to a roll in range [0, max).
 * Used for mission success/fail and NFT drop rolls.
 */
export function deriveRoll(randomByte: number, max: number): number {
  return Math.floor((randomByte / 256) * max);
}

/**
 * Full flow: read, validate, consume a VRF result.
 * Returns the randomness bytes or an error.
 */
export async function consumeVrf(
  vrfAccountKey: string,
  expectedWallet: string
): Promise<{ randomness: Uint8Array } | { error: string }> {
  try {
    const vrfPubkey = new PublicKey(vrfAccountKey);
    const result = await readVrfResult(vrfPubkey);

    if (!result) {
      return { error: "VRF account not found" };
    }

    const validation = validateVrfResult(result, expectedWallet);
    if (!validation.valid) {
      return { error: validation.error! };
    }

    if (!markVrfConsumed(vrfAccountKey)) {
      return { error: "VRF result already consumed" };
    }

    return { randomness: result.randomness };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown VRF error";
    return { error: msg };
  }
}

// ── Epoch Bonus Rewards (VRF-powered) ──

// Multiplier tiers based on random byte [0-255]
// 0-179 (70%) = 1.0x, 180-229 (20%) = 1.5x, 230-249 (8%) = 2.0x, 250-255 (2%) = 3.0x
function deriveMultiplier(byte: number): number {
  if (byte >= 250) return 3.0;
  if (byte >= 230) return 2.0;
  if (byte >= 180) return 1.5;
  return 1.0;
}

// Loot tier: 0-179 (70%) = T1, 180-239 (24%) = T2, 240-255 (6%) = T3
function deriveLootTier(byte: number): number {
  if (byte >= 240) return 3;
  if (byte >= 180) return 2;
  return 1;
}

// NFT drop: 0-12 out of 256 = ~5% chance
function deriveNftDrop(byte: number): boolean {
  return byte < 13;
}

/**
 * Compute epoch bonus rewards using VRF randomness (or Math.random() fallback).
 * Called during epoch finalization.
 */
export async function computeEpochBonus(
  wallet: string,
  characterId: string | null,
  run: WeeklyRun | null,
  vrfAccountKey: string | null
): Promise<EpochBonusRewards | null> {
  if (!run || !characterId) return null;

  // Base rewards scale with score
  const baseScrap = Math.floor(run.score * 0.1) + 50;
  const baseCrystal = Math.floor(run.score * 0.02) + 10;
  const baseArtifact = run.bossDefeated ? 3 : 1;

  let randomBytes: Uint8Array;
  let vrfVerified = false;
  let vrfAccount: string | null = null;

  // Try VRF first
  if (vrfAccountKey) {
    const vrfResult = await consumeVrf(vrfAccountKey, wallet);
    if ("randomness" in vrfResult) {
      randomBytes = vrfResult.randomness;
      vrfVerified = true;
      vrfAccount = vrfAccountKey;
    } else {
      console.warn(`[VRF] Epoch bonus fallback: ${vrfResult.error}`);
      randomBytes = fallbackRandomBytes();
    }
  } else {
    randomBytes = fallbackRandomBytes();
  }

  // Derive rewards from random bytes
  // byte[0] = multiplier, byte[1] = loot tier, byte[2] = NFT drop, byte[3] = loot item selection
  const multiplier = deriveMultiplier(randomBytes[0]);
  const lootTier = deriveLootTier(randomBytes[1]);
  const nftDrop = deriveNftDrop(randomBytes[2]);

  const bonusScrap = Math.floor(baseScrap * multiplier);
  const bonusCrystal = Math.floor(baseCrystal * multiplier);
  const bonusArtifact = Math.floor(baseArtifact * multiplier);

  // Grant resources to character's inventory
  db.prepare(
    "UPDATE inventories SET scrap = scrap + ?, crystal = crystal + ?, artifact = artifact + ? WHERE character_id = ?"
  ).run(bonusScrap, bonusCrystal, bonusArtifact, characterId);

  // Grant loot drop
  let lootItemId: string | null = null;
  if (lootTier >= 2) {
    lootItemId = getRandomTier2ItemId();
  } else {
    lootItemId = getRandomLootItemId();
  }
  if (lootItemId) {
    addLoot(characterId, lootItemId, 1);
  }

  return {
    multiplier,
    bonusScrap,
    bonusCrystal,
    bonusArtifact,
    lootTier,
    lootItemId,
    nftDrop,
    vrfVerified,
    vrfAccount,
  };
}

function fallbackRandomBytes(): Uint8Array {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}
