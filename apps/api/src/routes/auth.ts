import { Hono } from "hono";
import { createNonce, verifySignature, createToken } from "../services/auth-service.js";

const auth = new Hono();

auth.get("/nonce", (c) => {
  const nonce = createNonce();
  return c.json({ nonce });
});

auth.post("/verify", async (c) => {
  const { publicKey, signature, nonce } = await c.req.json();

  if (!publicKey || !signature || !nonce) {
    return c.json({ error: "UNAUTHORIZED", message: "Missing required fields" }, 400);
  }

  const valid = verifySignature(publicKey, signature, nonce);
  if (!valid) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid signature" }, 401);
  }

  const token = createToken(publicKey);
  return c.json({ token });
});

// Dev-only login endpoint — skips signature verification
auth.post("/dev-login", async (c) => {
  if (process.env.NODE_ENV === "production") {
    return c.json({ error: "UNAUTHORIZED", message: "Not available in production" }, 403);
  }

  const { publicKey } = await c.req.json();
  if (!publicKey) {
    return c.json({ error: "UNAUTHORIZED", message: "Missing publicKey" }, 400);
  }

  const token = createToken(publicKey);
  return c.json({ token });
});

export default auth;
