import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
import { getQuestStatus, completeQuest } from "../services/quest-service.js";
import {
  getTokenPrice,
  searchToken,
  getWalletHoldings,
  getTokenPrices,
  getPredictionEvents,
  getSwapOrder,
  executeSwap,
} from "../services/jupiter-service.js";

const SOL_MINT = "So11111111111111111111111111111111111111112";

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

  const body = await c.req.json<{ mint?: string }>().catch(() => ({} as { mint?: string }));
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

  const body = await c.req.json<{ query?: string }>().catch(() => ({} as { query?: string }));
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

  // Batch-query prices for SOL + top 10 held tokens
  const tokenMints = holdings.tokens
    .sort((a, b) => b.uiAmount - a.uiAmount)
    .slice(0, 10)
    .map((t) => t.mint);
  const priceMints = [SOL_MINT, ...tokenMints];
  const prices = await getTokenPrices(priceMints);
  const priceMap = new Map(prices.map((p) => [p.mint, p.usdPrice]));

  const solUsdPrice = priceMap.get(SOL_MINT) ?? 0;
  const solUsdValue = holdings.solBalance * (solUsdPrice || 0);

  const tokens = tokenMints.map((mint) => {
    const holding = holdings.tokens.find((t) => t.mint === mint)!;
    const usdPrice = priceMap.get(mint) ?? 0;
    return {
      mint,
      uiAmount: holding.uiAmount,
      usdPrice: usdPrice || 0,
      usdValue: holding.uiAmount * (usdPrice || 0),
    };
  });

  const totalUsd = solUsdValue + tokens.reduce((sum, t) => sum + t.usdValue, 0);

  const data = { solBalance: holdings.solBalance, solUsdPrice: solUsdPrice || 0, totalUsd, tokens };
  const questResult = completeQuest(wallet, char.id, "portfolio_check", data);

  return c.json({ ...questResult, data });
});

// ── POST /pnl-report (now Price Watch — 24h price changes) ──
quests.post("/pnl-report", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);
  }

  const holdings = await getWalletHoldings(wallet);

  // Price V3 for SOL + top 9 held tokens
  const tokenMints = holdings.tokens
    .sort((a, b) => b.uiAmount - a.uiAmount)
    .slice(0, 9)
    .map((t) => t.mint);
  const priceMints = [SOL_MINT, ...tokenMints];
  const prices = await getTokenPrices(priceMints);

  const priceChanges = prices.map((p) => ({
    mint: p.mint,
    isSOL: p.mint === SOL_MINT,
    usdPrice: p.usdPrice ?? 0,
    priceChange24h: p.priceChange24h ?? 0,
    held: p.mint === SOL_MINT
      ? holdings.solBalance
      : holdings.tokens.find((t) => t.mint === p.mint)?.uiAmount ?? 0,
  }));

  const data = { priceChanges };
  const questResult = completeQuest(wallet, char.id, "pnl_report", data);

  return c.json({ ...questResult, data });
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

// ── POST /execute-swap ── proxy to Jupiter execute (avoids CORS)
quests.post("/execute-swap", async (c) => {
  const body = await c.req.json<{ signedTransaction?: string; requestId?: string }>().catch(() => ({} as { signedTransaction?: string; requestId?: string }));
  if (!body.signedTransaction || !body.requestId) {
    return c.json(
      { error: "BAD_REQUEST", message: "signedTransaction and requestId are required" },
      400
    );
  }

  const result = await executeSwap(body.signedTransaction, body.requestId);
  if (result.error) {
    return c.json({ error: "SWAP_FAILED", message: result.error }, 502);
  }
  return c.json({ status: result.status, signature: result.signature });
});

// ── POST /micro-swap ──
quests.post("/micro-swap", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json({ error: "CHARACTER_NOT_FOUND", message: "No character found" }, 404);
  }

  const body = await c.req.json<{ signature?: string }>().catch(() => ({} as { signature?: string }));
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

  const body = await c.req.json<{ marketId?: string; signature?: string }>().catch(() => ({} as { marketId?: string; signature?: string }));
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
