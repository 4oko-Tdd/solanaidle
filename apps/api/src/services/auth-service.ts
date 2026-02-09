import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import nacl from "tweetnacl";
import bs58 from "bs58";
import db from "../db/database.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-prod";
const NONCE_EXPIRY_MINUTES = 5;

export function createNonce(): string {
  const random = randomBytes(32).toString("hex");
  const nonce = `Sign this message to verify your wallet: ${random}`;
  db.prepare("INSERT INTO nonces (nonce) VALUES (?)").run(nonce);
  return nonce;
}

export function verifySignature(publicKey: string, signature: string, nonce: string): boolean {
  const row = db.prepare(
    "SELECT * FROM nonces WHERE nonce = ? AND datetime(created_at, '+' || ? || ' minutes') > datetime('now')"
  ).get(nonce, NONCE_EXPIRY_MINUTES) as { nonce: string } | undefined;

  if (!row) return false;

  db.prepare("DELETE FROM nonces WHERE nonce = ?").run(nonce);

  try {
    const messageBytes = new TextEncoder().encode(nonce);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(publicKey);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

export function createToken(walletAddress: string): string {
  return jwt.sign({ wallet: walletAddress }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { wallet: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { wallet: string };
  } catch {
    return null;
  }
}
