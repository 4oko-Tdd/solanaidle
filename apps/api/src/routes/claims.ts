import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getCharacter } from "../services/character-service.js";
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
      "SELECT id, mission_id as missionId, nft_name as nftName, claimed_at as claimedAt FROM nft_claims WHERE character_id = ?"
    )
    .all(char.id);
  return c.json(rows);
});

claims.post("/:id/mint", (c) => {
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
    | { id: string; character_id: string; mission_id: string; nft_name: string; claimed_at: string | null }
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

  // MVP: just mark as claimed (actual Solana mint is future work)
  db.prepare("UPDATE nft_claims SET claimed_at = datetime('now') WHERE id = ?").run(
    claimId
  );

  return c.json({
    transaction: null,
    message: `Claimed: ${claim.nft_name} (on-chain minting coming soon)`,
  });
});

export default claims;
