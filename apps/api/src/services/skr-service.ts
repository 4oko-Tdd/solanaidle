import { randomUUID } from "node:crypto";
import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import db from "../db/database.js";
import { serverKeypair } from "./server-keypair.js";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const DEFAULT_SKR_MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
const DEFAULT_SKR_DECIMALS = 9;

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const TOKEN_IX_MINT_TO_CHECKED = 14;

function parsePublicKey(value: string, fallback: string, label: string): PublicKey {
  try {
    return new PublicKey(value);
  } catch {
    console.warn(`[SKR] Invalid ${label}: ${value}. Falling back to ${fallback}`);
    return new PublicKey(fallback);
  }
}

function parseDecimals(raw: string | undefined): number {
  if (!raw) return DEFAULT_SKR_DECIMALS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 12) {
    console.warn(`[SKR] Invalid SKR_TOKEN_DECIMALS: ${raw}. Falling back to ${DEFAULT_SKR_DECIMALS}`);
    return DEFAULT_SKR_DECIMALS;
  }
  return parsed;
}

const SKR_DECIMALS = parseDecimals(process.env.SKR_TOKEN_DECIMALS);
const SKR_MINT = parsePublicKey(
  process.env.SKR_MINT_ADDRESS || DEFAULT_SKR_MINT,
  DEFAULT_SKR_MINT,
  "SKR_MINT_ADDRESS"
);
const DEFAULT_TREASURY = serverKeypair.publicKey.toBase58();
const SKR_TREASURY_WALLET = parsePublicKey(
  process.env.SKR_TREASURY_WALLET || DEFAULT_TREASURY,
  DEFAULT_TREASURY,
  "SKR_TREASURY_WALLET"
);
const SKR_BASE_UNITS = 10n ** BigInt(SKR_DECIMALS);

const connection = new Connection(SOLANA_RPC_URL, "confirmed");

export const SKR_CONFIG = {
  mintAddress: SKR_MINT.toBase58(),
  treasuryWallet: SKR_TREASURY_WALLET.toBase58(),
  decimals: SKR_DECIMALS,
} as const;

export interface VerifySkrPaymentInput {
  signature: string;
  walletAddress: string;
  amount: number;
  action: string;
  weekStart: string;
}

export interface VerifySkrPaymentResult {
  success: boolean;
  error?: string;
}

function deriveAssociatedTokenAddress(owner: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

function toBaseUnits(amount: number): bigint {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`Invalid SKR amount: ${amount}`);
  }
  return BigInt(amount) * SKR_BASE_UNITS;
}

function sumOwnerMintBalances(
  balances: Array<{ owner?: string; mint: string; uiTokenAmount: { amount: string } }> | null | undefined,
  owner: string
): bigint {
  if (!balances?.length) return 0n;
  let total = 0n;
  for (const balance of balances) {
    if (balance.mint !== SKR_MINT.toBase58()) continue;
    if (balance.owner !== owner) continue;
    total += BigInt(balance.uiTokenAmount.amount);
  }
  return total;
}

function buildCreateAssociatedTokenAccountInstruction(
  payer: PublicKey,
  ata: PublicKey,
  owner: PublicKey,
  mint: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.alloc(0),
  });
}

function buildMintToCheckedInstruction(
  mint: PublicKey,
  destination: PublicKey,
  authority: PublicKey,
  amount: bigint,
  decimals: number
): TransactionInstruction {
  const data = Buffer.alloc(10);
  data.writeUInt8(TOKEN_IX_MINT_TO_CHECKED, 0);
  data.writeBigUInt64LE(amount, 1);
  data.writeUInt8(decimals, 9);

  return new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    data,
  });
}

export function creditDbSkr(walletAddress: string, amount: number): number {
  db.prepare(
    `INSERT INTO skr_wallets (wallet_address, balance) VALUES (?, ?)
     ON CONFLICT(wallet_address) DO UPDATE SET balance = balance + ?`
  ).run(walletAddress, amount, amount);
  const row = db
    .prepare("SELECT balance FROM skr_wallets WHERE wallet_address = ?")
    .get(walletAddress) as { balance: number };
  return row.balance;
}

function getDbSkrBalance(walletAddress: string): number {
  const row = db
    .prepare("SELECT balance FROM skr_wallets WHERE wallet_address = ?")
    .get(walletAddress) as { balance: number } | undefined;
  return row?.balance ?? 0;
}

export async function getSkrBalance(walletAddress: string): Promise<number> {
  let owner: PublicKey;
  try {
    owner = new PublicKey(walletAddress);
  } catch {
    return 0;
  }

  let onChain = 0;
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      owner,
      { mint: SKR_MINT },
      "confirmed"
    );
    let raw = 0n;
    for (const account of tokenAccounts.value) {
      const parsed = account.account.data.parsed as {
        info?: { tokenAmount?: { amount?: string } };
      };
      const amount = parsed.info?.tokenAmount?.amount;
      if (!amount) continue;
      raw += BigInt(amount);
    }
    const whole = raw / SKR_BASE_UNITS;
    onChain = whole > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(whole);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("could not find mint")) {
      console.warn("[SKR] Failed to fetch on-chain SKR balance:", err);
    }
  }

  return onChain + getDbSkrBalance(walletAddress);
}

export async function verifyAndRecordSkrPayment(
  input: VerifySkrPaymentInput
): Promise<VerifySkrPaymentResult> {
  const signature = input.signature.trim();
  if (!signature) {
    return { success: false, error: "SKR_PAYMENT_SIGNATURE_REQUIRED" };
  }

  const existing = db
    .prepare("SELECT signature FROM skr_payments WHERE signature = ?")
    .get(signature) as { signature: string } | undefined;
  if (existing) {
    return { success: false, error: "SKR_PAYMENT_ALREADY_USED" };
  }

  const required = toBaseUnits(input.amount);

  const tx = await connection.getParsedTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!tx || !tx.meta || tx.meta.err) {
    return { success: false, error: "INVALID_SKR_PAYMENT" };
  }

  const signedByWallet = tx.transaction.message.accountKeys.some(
    (key) => key.pubkey.toBase58() === input.walletAddress && key.signer
  );
  if (!signedByWallet) {
    return { success: false, error: "INVALID_SKR_PAYMENT" };
  }

  const walletPre = sumOwnerMintBalances(tx.meta.preTokenBalances, input.walletAddress);
  const walletPost = sumOwnerMintBalances(tx.meta.postTokenBalances, input.walletAddress);
  const treasuryOwner = SKR_TREASURY_WALLET.toBase58();
  const treasuryPre = sumOwnerMintBalances(tx.meta.preTokenBalances, treasuryOwner);
  const treasuryPost = sumOwnerMintBalances(tx.meta.postTokenBalances, treasuryOwner);

  const walletDebit = walletPre > walletPost ? walletPre - walletPost : 0n;
  const treasuryCredit = treasuryPost > treasuryPre ? treasuryPost - treasuryPre : 0n;

  if (walletDebit < required || treasuryCredit < required) {
    return { success: false, error: "INSUFFICIENT_SKR" };
  }

  const burned = Math.floor(input.amount * 0.5);
  const treasury = Math.floor(input.amount * 0.3);
  const reserve = input.amount - burned - treasury;

  try {
    const recordTx = db.transaction(() => {
      db.prepare(
        `INSERT INTO skr_payments
          (signature, wallet_address, week_start, action, amount)
         VALUES (?, ?, ?, ?, ?)`
      ).run(signature, input.walletAddress, input.weekStart, input.action, input.amount);

      db.prepare(
        `INSERT INTO skr_spends
          (id, wallet_address, week_start, action, amount, burned, treasury, reserve)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        randomUUID(),
        input.walletAddress,
        input.weekStart,
        input.action,
        input.amount,
        burned,
        treasury,
        reserve
      );

      db.prepare(
        "UPDATE skr_distribution SET burned = burned + ?, treasury = treasury + ?, reserve = reserve + ? WHERE id = 1"
      ).run(burned, treasury, reserve);
    });
    recordTx();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("UNIQUE constraint failed: skr_payments.signature")) {
      return { success: false, error: "SKR_PAYMENT_ALREADY_USED" };
    }
    throw err;
  }

  return { success: true };
}

export async function mintMockSkrToWallet(walletAddress: string, amount: number): Promise<{
  signature: string;
  balance: number;
}> {
  const destinationOwner = new PublicKey(walletAddress);
  const destinationAta = deriveAssociatedTokenAddress(destinationOwner, SKR_MINT);
  const ix: TransactionInstruction[] = [];

  const existingAta = await connection.getAccountInfo(destinationAta, "confirmed");
  if (!existingAta) {
    ix.push(
      buildCreateAssociatedTokenAccountInstruction(
        serverKeypair.publicKey,
        destinationAta,
        destinationOwner,
        SKR_MINT
      )
    );
  }

  ix.push(
    buildMintToCheckedInstruction(
      SKR_MINT,
      destinationAta,
      serverKeypair.publicKey,
      toBaseUnits(amount),
      SKR_DECIMALS
    )
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({
    feePayer: serverKeypair.publicKey,
    recentBlockhash: blockhash,
  }).add(...ix);

  tx.sign(serverKeypair);
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  await connection.confirmTransaction(
    {
      signature,
      blockhash,
      lastValidBlockHeight,
    },
    "confirmed"
  );

  return {
    signature,
    balance: await getSkrBalance(walletAddress),
  };
}
