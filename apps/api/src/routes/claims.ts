import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
import { mintRelic, isMintingAvailable } from "../services/metaplex-service.js";
import { getWeekBounds } from "../services/run-service.js";
import db from "../db/database.js";

type Env = { Variables: { wallet: string } };

const claims = new Hono<Env>();
claims.use("*", authMiddleware);

claims.get("/", (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char)
    return c.json(
      { error: "CHARACTER_NOT_FOUND", message: "No character found" },
      404
    );

  const rows = db
    .prepare(
      "SELECT id, mission_id as missionId, nft_name as nftName, claimed_at as claimedAt, mint_address as mintAddress FROM nft_claims WHERE character_id = ?"
    )
    .all(char.id);
  return c.json(rows);
});

claims.post("/:id/mint", async (c) => {
  const wallet = c.get("wallet");
  const char = getCharacter(wallet);
  if (!char)
    return c.json(
      { error: "CHARACTER_NOT_FOUND", message: "No character found" },
      404
    );

  const claimId = c.req.param("id");
  const claim = db
    .prepare("SELECT * FROM nft_claims WHERE id = ? AND character_id = ?")
    .get(claimId, char.id) as
    | { id: string; character_id: string; mission_id: string; nft_name: string; claimed_at: string | null; mint_address: string | null }
    | undefined;

  if (!claim)
    return c.json(
      { error: "CLAIM_NOT_FOUND", message: "Claim not found" },
      404
    );
  if (claim.claimed_at)
    return c.json(
      { error: "ALREADY_CLAIMED", message: "Already claimed" },
      409
    );

  let mintAddress: string | null = null;

  if (isMintingAvailable()) {
    try {
      const { weekStart } = getWeekBounds();
      const result = await mintRelic(wallet, claim.nft_name, {
        item_name: claim.nft_name,
        source_mission: claim.mission_id,
        epoch: weekStart,
        player_level: String(char.level),
        dropped_at: new Date().toISOString(),
      });
      mintAddress = result.mintAddress;
    } catch (err) {
      console.error("Relic mint failed:", err);
      // Still mark as claimed even if mint fails
    }
  }

  db.prepare(
    "UPDATE nft_claims SET claimed_at = datetime('now'), mint_address = ? WHERE id = ?"
  ).run(mintAddress, claimId);

  return c.json({
    mintAddress,
    message: mintAddress
      ? `Minted: ${claim.nft_name}`
      : `Claimed: ${claim.nft_name} (on-chain mint unavailable)`,
  });
});

export default claims;
