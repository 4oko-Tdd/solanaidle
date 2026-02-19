import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
import { getEarnedBadges, getAchievementName } from "../services/achievement-service.js";
import db from "../db/database.js";
import type { TrophyCaseData, RelicItem, BadgeItem } from "@solanaidle/shared";

type Env = { Variables: { wallet: string } };

const nfts = new Hono<Env>();

// Authenticated: get player's relics + badges
nfts.get("/", authMiddleware, (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char)
    return c.json(
      { error: "CHARACTER_NOT_FOUND", message: "No character found" },
      404
    );

  // Relics from nft_claims
  const relicRows = db
    .prepare(
      "SELECT id, nft_name, mission_id, mint_address, claimed_at FROM nft_claims WHERE character_id = ?"
    )
    .all(char.id) as {
    id: string;
    nft_name: string;
    mission_id: string;
    mint_address: string | null;
    claimed_at: string | null;
  }[];

  const relics: RelicItem[] = relicRows.map((r) => ({
    id: r.id,
    name: r.nft_name,
    missionId: r.mission_id,
    mintAddress: r.mint_address,
    claimedAt: r.claimed_at,
  }));

  // Badges from achievement_badges
  const badgeRows = getEarnedBadges(wallet);
  const badges: BadgeItem[] = badgeRows.map((b) => ({
    id: b.id,
    achievementId: b.achievement_id as BadgeItem["achievementId"],
    name: getAchievementName(b.achievement_id),
    earnedAt: b.earned_at,
    mintAddress: b.mint_address,
  }));

  const data: TrophyCaseData = { relics, badges };
  return c.json(data);
});

// Public: Metaplex-standard JSON metadata
nfts.get("/metadata/:type/:id", (c) => {
  const type = c.req.param("type");
  const id = c.req.param("id");

  if (type === "collection") {
    if (id === "relics") {
      return c.json({
        name: "Seeker Node: Relics",
        description:
          "Rare relic NFTs dropped from missions in Seeker Node. Each relic represents a unique find from the game world.",
        image: "",
        external_url: "https://solanaidle.com",
      });
    }
    if (id === "achievements") {
      return c.json({
        name: "Seeker Node: Achievements",
        description:
          "Achievement badge NFTs earned through gameplay milestones in Seeker Node. Permanent on-chain proof of accomplishment.",
        image: "",
        external_url: "https://solanaidle.com",
      });
    }
    return c.json({ error: "Not found" }, 404);
  }

  if (type === "relic") {
    // Look up from nft_claims by mint_address
    const row = db
      .prepare(
        "SELECT nft_name, mission_id, claimed_at FROM nft_claims WHERE mint_address = ?"
      )
      .get(id) as
      | { nft_name: string; mission_id: string; claimed_at: string | null }
      | undefined;

    if (!row) {
      return c.json({
        name: "Seeker Node Relic",
        description: "A relic from Seeker Node.",
        image: "",
        attributes: [],
      });
    }

    return c.json({
      name: row.nft_name,
      description: `A rare relic dropped from the ${row.mission_id} mission in Seeker Node.`,
      image: "",
      external_url: "https://solanaidle.com",
      attributes: [
        { trait_type: "Item", value: row.nft_name },
        { trait_type: "Source Mission", value: row.mission_id },
        { trait_type: "Claimed At", value: row.claimed_at ?? "unclaimed" },
      ],
    });
  }

  if (type === "badge") {
    // Look up from achievement_badges by mint_address
    const row = db
      .prepare(
        "SELECT achievement_id, earned_at FROM achievement_badges WHERE mint_address = ?"
      )
      .get(id) as
      | { achievement_id: string; earned_at: string }
      | undefined;

    if (!row) {
      return c.json({
        name: "Seeker Node Achievement",
        description: "An achievement badge from Seeker Node.",
        image: "",
        attributes: [],
      });
    }

    const name = getAchievementName(row.achievement_id);
    return c.json({
      name,
      description: `Achievement badge: ${name}. Earned in Seeker Node.`,
      image: "",
      external_url: "https://solanaidle.com",
      attributes: [
        { trait_type: "Achievement", value: row.achievement_id },
        { trait_type: "Name", value: name },
        { trait_type: "Earned At", value: row.earned_at },
      ],
    });
  }

  return c.json({ error: "Not found" }, 404);
});

export default nfts;
