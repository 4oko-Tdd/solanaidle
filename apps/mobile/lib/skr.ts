import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const TOKEN_IX_TRANSFER_CHECKED = 12;

const DEFAULT_SKR_MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
const DEFAULT_SKR_TREASURY = "8dTVW4jfpfxZr6w91nW2fKV7qzs2M4Pt42z6wJ8eFKiJ";
const DEFAULT_SKR_DECIMALS = 9;

function parseDecimals(raw: string | undefined): number {
  if (!raw) return DEFAULT_SKR_DECIMALS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 12) {
    return DEFAULT_SKR_DECIMALS;
  }
  return parsed;
}

export const SKR_TOKEN = {
  symbol: "SKR",
  name: "Seeker Token",
  address: process.env.EXPO_PUBLIC_SKR_MINT_ADDRESS || DEFAULT_SKR_MINT,
  decimals: parseDecimals(process.env.EXPO_PUBLIC_SKR_TOKEN_DECIMALS),
  treasuryWallet: process.env.EXPO_PUBLIC_SKR_TREASURY_WALLET || DEFAULT_SKR_TREASURY,
  iconUrl: "https://gateway.irys.xyz/uP1dFvCofZQT26m3SKOCttXrir3ORBR1B8wPhP6tv7M?ext=png",
} as const;

interface PaySkrParams {
  walletAddress: string;
  amount: number;
  connection: Connection;
  signAndSendTransaction: (tx: Transaction) => Promise<string>;
}

function deriveAssociatedTokenAddress(owner: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

function buildTransferCheckedInstruction(
  source: PublicKey,
  mint: PublicKey,
  destination: PublicKey,
  owner: PublicKey,
  amount: bigint,
  decimals: number
): TransactionInstruction {
  const data = Buffer.alloc(10);
  data.writeUInt8(TOKEN_IX_TRANSFER_CHECKED, 0);
  data.writeBigUInt64LE(amount, 1);
  data.writeUInt8(decimals, 9);

  return new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data,
  });
}

function toBaseUnits(amount: number, decimals: number): bigint {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Invalid SKR amount");
  }
  return BigInt(amount) * (10n ** BigInt(decimals));
}

export async function paySkrOnChain({
  walletAddress,
  amount,
  connection,
  signAndSendTransaction,
}: PaySkrParams): Promise<string> {
  const owner = new PublicKey(walletAddress);
  const mint = new PublicKey(SKR_TOKEN.address);
  const treasuryOwner = new PublicKey(SKR_TOKEN.treasuryWallet);
  const sourceAta = deriveAssociatedTokenAddress(owner, mint);
  const treasuryAta = deriveAssociatedTokenAddress(treasuryOwner, mint);

  const sourceAtaInfo = await connection.getAccountInfo(sourceAta, "confirmed");
  if (!sourceAtaInfo) {
    throw new Error("No SKR token account found for this wallet");
  }
  const treasuryAtaInfo = await connection.getAccountInfo(treasuryAta, "confirmed");
  if (!treasuryAtaInfo) {
    throw new Error("SKR treasury token account is not initialized");
  }

  const ix = buildTransferCheckedInstruction(
    sourceAta,
    mint,
    treasuryAta,
    owner,
    toBaseUnits(amount, SKR_TOKEN.decimals),
    SKR_TOKEN.decimals
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({
    feePayer: owner,
    recentBlockhash: blockhash,
  }).add(ix);

  const signature = await signAndSendTransaction(tx);
  await connection.confirmTransaction(
    {
      signature,
      blockhash,
      lastValidBlockHeight,
    },
    "confirmed"
  );

  return signature;
}
