import { Hono } from "hono";
import { randomUUID } from "crypto";
import { authMiddleware } from "../middleware/auth.js";
import {
  PERK_DEFINITIONS,
  PERK_TIER_WEIGHTS,
  CLASS_PERK_WEIGHTS,
  getPerk,
} from "../services/game-config.js";
import { getActiveRun } from "../services/run-service.js";
import { getCharacter } from "../services/character-service.js";
import { insertEvent } from "../services/event-service.js";
import db from "../db/database.js";
import type { PerkDefinition } from "@solanaidle/shared";

type Env = { Variables: { wallet: string } };

const app = new Hono<Env>();
app.use("*", authMiddleware);

// ── Helpers ──

/** Generate 3 weighted random perk offers based on tier weights and class affinity. */
function generatePerkOffers(classId?: string): PerkDefinition[] {
  const offers: PerkDefinition[] = [];
  const used = new Set<string>();

  while (offers.length < 3) {
    // Roll tier
    const roll = Math.random();
    let tier: "common" | "rare" | "legendary";
    if (roll < PERK_TIER_WEIGHTS.common) {
      tier = "common";
    } else if (roll < PERK_TIER_WEIGHTS.common + PERK_TIER_WEIGHTS.rare) {
      tier = "rare";
    } else {
      tier = "legendary";
    }

    // Filter perks by tier
    const tierPerks = PERK_DEFINITIONS.filter(
      (p) => p.tier === tier && !used.has(p.id)
    );
    if (tierPerks.length === 0) continue;

    // Apply class weighting
    const classWeights = classId ? CLASS_PERK_WEIGHTS[classId] : undefined;
    const weighted = tierPerks.map((p) => {
      let weight = 1;
      if (classWeights) {
        // Check if any of the perk's effect keys match a class weight category
        for (const key of Object.keys(p.effect)) {
          if (classWeights[key]) {
            weight *= classWeights[key];
          }
        }
      }
      return { perk: p, weight };
    });

    // Weighted random selection
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let pick = Math.random() * totalWeight;
    let selected: PerkDefinition | null = null;
    for (const w of weighted) {
      pick -= w.weight;
      if (pick <= 0) {
        selected = w.perk;
        break;
      }
    }
    if (!selected) selected = weighted[weighted.length - 1].perk;

    used.add(selected.id);
    offers.push(selected);
  }

  return offers;
}

// GET /perks/offers
app.get("/offers", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json({ error: "CHARACTER_NOT_FOUND" }, 404);
  }

  const run = getActiveRun(wallet);
  if (!run) {
    return c.json({ offers: [], hasPending: false });
  }

  // Count perks chosen this run
  const perkCountRow = db
    .prepare("SELECT COUNT(*) as cnt FROM character_perks WHERE run_id = ?")
    .get(run.id) as { cnt: number };
  const perkCount = perkCountRow.cnt;

  // Player gets a perk choice each level after level 1
  // So at level 2 they should have 1 perk, level 3 should have 2, etc.
  // Plus any bonus perk points granted (e.g. starter perk on epoch start)
  const bonusRow = db
    .prepare("SELECT bonus_perk_points FROM weekly_runs WHERE id = ?")
    .get(run.id) as { bonus_perk_points: number } | undefined;
  const bonusPoints = bonusRow?.bonus_perk_points ?? 0;
  const expectedPerks = Math.max(0, char.level - 1) + bonusPoints;
  const hasPending = expectedPerks > perkCount;

  if (!hasPending) {
    return c.json({ offers: [], hasPending: false });
  }

  const offers = generatePerkOffers(run.classId);
  return c.json({ offers, hasPending: true });
});

// POST /perks/choose
app.post("/choose", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char) {
    return c.json({ error: "CHARACTER_NOT_FOUND" }, 404);
  }

  const run = getActiveRun(wallet);
  if (!run) {
    return c.json({ error: "NO_ACTIVE_RUN" }, 400);
  }

  const { perkId } = await c.req.json();
  const perk = getPerk(perkId);
  if (!perk) {
    return c.json({ error: "INVALID_PERK", message: "Perk not found" }, 400);
  }

  // Check they have a pending choice (level-based + bonus perk points)
  const perkCountRow = db
    .prepare("SELECT COUNT(*) as cnt FROM character_perks WHERE run_id = ?")
    .get(run.id) as { cnt: number };
  const bonusRowChoose = db
    .prepare("SELECT bonus_perk_points FROM weekly_runs WHERE id = ?")
    .get(run.id) as { bonus_perk_points: number } | undefined;
  const bonusPointsChoose = bonusRowChoose?.bonus_perk_points ?? 0;
  const expectedPerks = Math.max(0, char.level - 1) + bonusPointsChoose;
  if (expectedPerks <= perkCountRow.cnt) {
    return c.json(
      { error: "NO_PENDING_CHOICE", message: "No perk choice pending" },
      400
    );
  }

  // Check if already owned
  const existing = db
    .prepare(
      "SELECT id, stacks FROM character_perks WHERE run_id = ? AND perk_id = ?"
    )
    .get(run.id, perkId) as { id: string; stacks: number } | undefined;

  if (existing) {
    if (!perk.stackable) {
      return c.json(
        {
          error: "PERK_NOT_STACKABLE",
          message: "Already have this perk and it cannot stack",
        },
        400
      );
    }
    // Increment stacks
    db.prepare(
      "UPDATE character_perks SET stacks = stacks + 1 WHERE id = ?"
    ).run(existing.id);
  } else {
    // Legendary limit: only one legendary per run
    if (perk.tier === "legendary") {
      const legendaryRow = db
        .prepare(
          `SELECT cp.id FROM character_perks cp
           WHERE cp.run_id = ? AND cp.perk_id IN (${PERK_DEFINITIONS.filter((p) => p.tier === "legendary")
             .map(() => "?")
             .join(",")})`
        )
        .get(
          run.id,
          ...PERK_DEFINITIONS.filter((p) => p.tier === "legendary").map(
            (p) => p.id
          )
        ) as { id: string } | undefined;

      if (legendaryRow) {
        return c.json(
          {
            error: "LEGENDARY_LIMIT",
            message: "Already have a legendary perk this run",
          },
          400
        );
      }
    }

    db.prepare(
      "INSERT INTO character_perks (id, run_id, perk_id, stacks) VALUES (?, ?, ?, 1)"
    ).run(randomUUID(), run.id, perkId);
  }

  // Decrement bonus_perk_points if this choice consumed a bonus slot
  const bonusNow = db
    .prepare("SELECT bonus_perk_points FROM weekly_runs WHERE id = ?")
    .get(run.id) as { bonus_perk_points: number } | undefined;
  if ((bonusNow?.bonus_perk_points ?? 0) > 0) {
    db.prepare("UPDATE weekly_runs SET bonus_perk_points = bonus_perk_points - 1 WHERE id = ?")
      .run(run.id);
  }

  // Log perk pick event
  insertEvent(run.id, "perk_pick", {
    perkId: perk.id,
    perkName: perk.name,
    tier: perk.tier,
    level: char.level,
  });

  // Return updated perks
  const perks = db
    .prepare("SELECT perk_id, stacks FROM character_perks WHERE run_id = ?")
    .all(run.id) as { perk_id: string; stacks: number }[];

  const activePerks = perks.map((p) => ({
    ...getPerk(p.perk_id),
    stacks: p.stacks,
  }));

  return c.json({ perks: activePerks });
});

// GET /perks/active
app.get("/active", (c) => {
  const wallet = c.get("wallet");
  const run = getActiveRun(wallet);
  if (!run) {
    return c.json({ perks: [] });
  }

  const perks = db
    .prepare("SELECT perk_id, stacks FROM character_perks WHERE run_id = ?")
    .all(run.id) as { perk_id: string; stacks: number }[];

  const activePerks = perks.map((p) => ({
    ...getPerk(p.perk_id),
    stacks: p.stacks,
  }));

  return c.json({ perks: activePerks });
});

export default app;
