import { Context, Next } from "hono";
import { verifyToken } from "../services/auth-service.js";

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

  c.set("wallet", payload.wallet);
  await next();
}
