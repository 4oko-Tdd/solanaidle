import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import {
  getDailyChallenges,
  rerollChallenge,
  CHALLENGE_REROLL_COST,
} from "../services/challenge-service.js";
import { verifyAndRecordSkrPayment } from "../services/skr-service.js";
import { getWeekStart } from "../services/boss-service.js";

type Env = { Variables: { wallet: string } };
const challenges = new Hono<Env>();
challenges.use("*", authMiddleware);

challenges.get("/", (c) => c.json(getDailyChallenges(c.get("wallet"))));

challenges.post("/reroll", async (c) => {
  // Parse body FIRST with fallback (per codebase convention)
  const { questId, paymentSignature } = await c.req
    .json<{ questId?: string; paymentSignature?: string }>()
    .catch(() => ({} as { questId?: string; paymentSignature?: string }));

  if (!paymentSignature?.trim()) {
    return c.json({ error: "PAYMENT_SIGNATURE_REQUIRED" }, 400);
  }
  if (!questId?.trim()) {
    return c.json({ error: "QUEST_ID_REQUIRED" }, 400);
  }

  const wallet = c.get("wallet");

  // Validate questId belongs to this player's current challenges
  const currentChallenges = getDailyChallenges(wallet);
  const challenge = currentChallenges.challenges.find(ch => ch.id === questId);
  if (!challenge) {
    return c.json({ error: "INVALID_QUEST_ID", message: "Quest not in current daily challenges" }, 400);
  }
  if (challenge.rerolled) {
    return c.json({ error: "ALREADY_REROLLED", message: "This challenge has already been rerolled today" }, 409);
  }

  const payment = await verifyAndRecordSkrPayment({
    signature: paymentSignature,
    walletAddress: wallet,
    amount: CHALLENGE_REROLL_COST,
    action: "challenge_reroll",
    weekStart: getWeekStart(),
  });
  if (!payment.success) {
    return c.json({ error: "INVALID_SKR_PAYMENT", message: payment.error }, 400);
  }

  rerollChallenge(wallet, questId);
  return c.json(getDailyChallenges(wallet));
});

export default challenges;
