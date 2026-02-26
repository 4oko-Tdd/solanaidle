import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { verifyToken } from "../services/auth-service.js";
import {
  getOrSpawnBoss,
  getCurrentBoss,
  getBossStatus,
  joinBossFight,
  useOverload,
  useReconnectProtocol,
  purchaseOverloadAmplifier,
  purchaseRaidLicense,
  updateAllPassiveDamage,
  resolveBoss,
} from "../services/boss-service.js";
import { rollBossDrops, applyDrops } from "../services/drop-service.js";
import { getWeekStart } from "../services/boss-service.js";
import { getBossPdaAddress, BOSS_ER_CONSTANTS } from "../services/boss-er-service.js";

type Env = { Variables: { wallet: string } };

const app = new Hono<Env>();

// GET /boss — public, but includes player contribution if authenticated
app.get("/", (c) => {
  // getOrSpawnBoss only works during boss phase; fall back to getCurrentBoss for dev-spawned bosses
  const boss = getOrSpawnBoss() ?? getCurrentBoss();
  if (!boss) {
    return c.json({ boss: null });
  }

  // Optional auth — try to extract wallet without requiring it
  let wallet: string | undefined;
  const header = c.req.header("Authorization");
  if (header?.startsWith("Bearer ")) {
    const payload = verifyToken(header.slice(7));
    if (payload) wallet = payload.wallet;
  }

  // Update passive damage before returning status
  updateAllPassiveDamage(boss.id);

  const status = getBossStatus(boss.id, wallet);
  if (!status) {
    return c.json({ boss: null });
  }

  return c.json(status);
});

// GET /boss/pda — public, returns PDA address for websocket subscription
app.get("/pda", (c) => {
  const weekStart = getWeekStart();
  const weekStartTs = Math.floor(new Date(weekStart).getTime() / 1000);
  const pda = getBossPdaAddress(weekStartTs);
  return c.json({
    pda,
    erValidatorUrl: BOSS_ER_CONSTANTS.ER_VALIDATOR_URL,
  });
});

// All routes below require auth
app.use("/*", authMiddleware);

// POST /boss/join
app.post("/join", (c) => {
  const wallet = c.get("wallet");
  const result = joinBossFight(wallet);
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }
  return c.json(result);
});

// POST /boss/overload
app.post("/overload", async (c) => {
  const wallet = c.get("wallet");
  const boss = getCurrentBoss();
  if (!boss) {
    return c.json({ error: "BOSS_NOT_ACTIVE" }, 400);
  }
  const { playerSignature } = await c.req
    .json<{ playerSignature?: string }>()
    .catch(() => ({} as { playerSignature?: string }));
  if (!playerSignature || !playerSignature.trim()) {
    return c.json(
      {
        error: "SIGNATURE_REQUIRED",
        message: "Boss OVERLOAD requires wallet signature",
      },
      400
    );
  }
  const result = await useOverload(wallet, boss.id, playerSignature);
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }
  return c.json(result);
});

// POST /boss/reconnect
app.post("/reconnect", (c) => {
  const wallet = c.get("wallet");
  const result = useReconnectProtocol(wallet);
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }
  return c.json(result);
});

// POST /boss/overload-amplifier
app.post("/overload-amplifier", (c) => {
  const wallet = c.get("wallet");
  const result = purchaseOverloadAmplifier(wallet);
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }
  return c.json(result);
});

// POST /boss/raid-license
app.post("/raid-license", (c) => {
  const wallet = c.get("wallet");
  const result = purchaseRaidLicense(wallet);
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }
  return c.json(result);
});

// GET /boss/results
app.get("/results", (c) => {
  const wallet = c.get("wallet");
  const boss = getCurrentBoss();
  if (!boss) {
    return c.json({ error: "NO_BOSS", message: "No boss this week" }, 404);
  }

  if (!boss.killed) {
    return c.json({
      error: "BOSS_NOT_RESOLVED",
      message: "Boss fight is still in progress",
    }, 400);
  }

  // Update passive damage one final time before resolving
  updateAllPassiveDamage(boss.id);

  const results = resolveBoss(boss.id);
  const playerEntry = results.participants.find((p) => p.wallet === wallet);

  let drops = null;
  if (playerEntry && playerEntry.contribution > 0) {
    drops = rollBossDrops(wallet, playerEntry.contribution);
    applyDrops(wallet, drops, getWeekStart());
  }

  return c.json({
    killed: results.killed,
    participants: results.participants,
    playerContribution: playerEntry?.contribution ?? 0,
    playerDamage: playerEntry?.totalDamage ?? 0,
    drops,
  });
});

export default app;
