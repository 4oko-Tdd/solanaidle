import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import nacl from "tweetnacl";
import bs58 from "bs58";
import db from "../db/database.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: JWT_SECRET environment variable is required in production");
  }
  console.warn("[Auth] JWT_SECRET not set — using insecure dev default. Set JWT_SECRET env var before deploying.");
}
const resolvedSecret = JWT_SECRET || "unsafe-dev-only-secret-" + process.pid;
const NONCE_EXPIRY_MINUTES = 5;

export function createNonce(): string {
  const random = randomBytes(32).toString("hex");
  const nonce = `Sign this message to verify your wallet: ${random}`;
  db.prepare("INSERT INTO nonces (nonce) VALUES (?)").run(nonce);
  return nonce;
}

export function verifySignature(publicKey: string, signature: string, nonce: string): boolean {
  // Atomic delete-and-check: prevents nonce reuse in concurrent requests.
  // If another request already consumed the nonce, changes === 0.
  const result = db.prepare(
    "DELETE FROM nonces WHERE nonce = ? AND datetime(created_at, '+' || ? || ' minutes') > datetime('now')"
  ).run(nonce, NONCE_EXPIRY_MINUTES);

  if (result.changes === 0) return false;

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
  return jwt.sign({ wallet: walletAddress }, resolvedSecret, { expiresIn: "7d" });
}

export function verifyToken(token: string): { wallet: string } | null {
  try {
    return jwt.verify(token, resolvedSecret) as { wallet: string };
  } catch {
    return null;
  }
}
