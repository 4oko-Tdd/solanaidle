import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
import { getQuestStatus, completeQuest } from "../services/quest-service.js";
import {
  getTokenPrice,
  searchToken,
  getWalletHoldings,
  getPredictionEvents,
  getSwapOrder,
} from "../services/jupiter-service.js";

type Env = { Variables: { wallet: string } };

const quests = new Hono<Env>();
quests.use("*", authMiddleware);

// ── GET /status ──
quests.get("/status", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);
  }
  const status = getQuestStatus(wallet, char.id);
  return c.json(status);
});

// ── POST /price-scout ──
quests.post("/price-scout", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);
  }

  const body = await c.req.json<{ mint?: string }>().catch(() => ({}));
  if (!body.mint || typeof body.mint !== "string") {
    return c.json({ error: "BAD_REQUEST", message: "mint is required" }, 400);
  }

  const priceData = await getTokenPrice(body.mint);
  const questResult = completeQuest(wallet, char.id, "price_scout", priceData);

  return c.json({ ...questResult, data: priceData });
});

// ── POST /token-scan ──
quests.post("/token-scan", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);
  }

  const body = await c.req.json<{ query?: string }>().catch(() => ({}));
  if (!body.query || typeof body.query !== "string") {
    return c.json({ error: "BAD_REQUEST", message: "query is required" }, 400);
  }

  const tokens = await searchToken(body.query);
  const questResult = completeQuest(wallet, char.id, "token_scan", { tokens });

  return c.json({ ...questResult, data: { tokens } });
});

// ── POST /portfolio-check ──
quests.post("/portfolio-check", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);
  }

  const holdings = await getWalletHoldings(wallet);
  const questResult = completeQuest(wallet, char.id, "portfolio_check", holdings);

  return c.json({ ...questResult, data: holdings });
});

// ── POST /pnl-report ──
quests.post("/pnl-report", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);
  }

  const holdings = await getWalletHoldings(wallet);
  const questResult = completeQuest(wallet, char.id, "pnl_report", holdings);

  return c.json({ ...questResult, data: holdings });
});

// ── GET /swap-order ──
quests.get("/swap-order", async (c) => {
  const wallet = c.get("wallet");
  const inputMint = c.req.query("inputMint");
  const outputMint = c.req.query("outputMint");
  const amount = c.req.query("amount");

  if (!inputMint || !outputMint || !amount) {
    return c.json(
      { error: "BAD_REQUEST", message: "inputMint, outputMint, and amount are required" },
      400
    );
  }

  const order = await getSwapOrder({ inputMint, outputMint, amount, taker: wallet });
  return c.json(order);
});

// ── POST /micro-swap ──
quests.post("/micro-swap", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);
  }

  const body = await c.req.json<{ signature?: string }>().catch(() => ({}));
  if (!body.signature || typeof body.signature !== "string") {
    return c.json({ error: "BAD_REQUEST", message: "signature is required" }, 400);
  }

  const questResult = completeQuest(wallet, char.id, "micro_swap", { signature: body.signature });

  return c.json(questResult);
});

// ── GET /predictions ──
quests.get("/predictions", async (c) => {
  const events = await getPredictionEvents();
  return c.json(events);
});

// ── POST /prediction-bet ──
quests.post("/prediction-bet", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);
  }

  const body = await c.req.json<{ marketId?: string; signature?: string }>().catch(() => ({}));
  if (!body.marketId || typeof body.marketId !== "string") {
    return c.json({ error: "BAD_REQUEST", message: "marketId is required" }, 400);
  }
  if (!body.signature || typeof body.signature !== "string") {
    return c.json({ error: "BAD_REQUEST", message: "signature is required" }, 400);
  }

  const questResult = completeQuest(wallet, char.id, "prediction_bet", {
    marketId: body.marketId,
    signature: body.signature,
  });

  return c.json(questResult);
});

export default quests;
