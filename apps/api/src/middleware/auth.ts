import { Context, Next } from "hono";
import { verifyToken } from "../services/auth-service.js";

// Solana base58 address: 32-44 chars, base58 alphabet only
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidSolanaAddress(addr: string): boolean {
  return SOLANA_ADDRESS_RE.test(addr);
}

export async function authMiddleware(c: Context, next: Next) {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "UNAUTHORIZED", message: "Missing or invalid token" }, 401);
  }

  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid or expired token" }, 401);
  }

  if (!isValidSolanaAddress(payload.wallet)) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid wallet address format" }, 401);
  }

  c.set("wallet", payload.wallet);
  await next();
}
