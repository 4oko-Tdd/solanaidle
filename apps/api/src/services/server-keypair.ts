import { Keypair } from "@solana/web3.js";

function loadKeypair(): Keypair {
  const keyStr = process.env.SERVER_KEYPAIR;
  if (keyStr) {
    try {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keyStr)));
    } catch {
      throw new Error("FATAL: SERVER_KEYPAIR is set but could not be parsed");
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: SERVER_KEYPAIR environment variable is required in production");
  }

  const kp = Keypair.generate();
  console.warn(`[Keypair] Generated ephemeral server keypair: ${kp.publicKey.toBase58()}`);
  console.warn("[Keypair] Set SERVER_KEYPAIR env var for persistent key in production");
  return kp;
}

export const serverKeypair = loadKeypair();
