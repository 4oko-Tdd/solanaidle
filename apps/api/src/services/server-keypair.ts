import { Keypair } from "@solana/web3.js";

function loadKeypair(): Keypair {
  try {
    const keyStr = process.env.SERVER_KEYPAIR;
    if (keyStr) {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keyStr)));
    }
  } catch {
    console.warn("[Keypair] Failed to parse SERVER_KEYPAIR, using ephemeral key");
  }
  const kp = Keypair.generate();
  console.log(`[Keypair] Generated ephemeral server keypair: ${kp.publicKey.toBase58()}`);
  console.log("[Keypair] Set SERVER_KEYPAIR env var for persistent key in production");
  return kp;
}

export const serverKeypair = loadKeypair();
