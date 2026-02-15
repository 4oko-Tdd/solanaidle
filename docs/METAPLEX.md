# Metaplex Core Integration

## Overview

Solana Idle uses **Metaplex Core** to mint two types of permanent on-chain assets that survive epoch resets — proof of player accomplishment that lives in their wallet forever.

While the core game loop is server-authoritative (missions, timers, RNG), the rewards layer is on-chain. Players earn NFTs through gameplay that persist across weekly epoch resets, are viewable in any Solana wallet or marketplace, and represent real proof of achievement.

---

## Asset Types

### 1. Relic NFTs

Rare mission drops. When a mission rewards an NFT (5-20% chance depending on mission tier), the player can claim it from their inventory. Claiming triggers a real Metaplex Core mint directly to their wallet.

Each relic carries on-chain attributes via the **Attributes plugin**:

| Attribute | Description | Example |
|---|---|---|
| `item_name` | The relic name | "Genesis Block Badge" |
| `source_mission` | Which mission dropped it | "deep_scan" |
| `epoch` | The weekly epoch it dropped in | "12" |
| `player_level` | Player's level at drop time | "7" |
| `dropped_at` | ISO timestamp of the drop | "2026-02-10T14:30:00Z" |

**Example relic names:**

- Genesis Block Badge
- Satoshi's Cipher
- Nakamoto Fragment
- Protocol Fossil
- Chain Relic Alpha

### 2. Achievement Badges

Earned through gameplay milestones. Minted automatically when conditions are met — no claim step required. The server detects eligibility and mints directly to the player's wallet.

On-chain attributes:

| Attribute | Description | Example |
|---|---|---|
| `achievement` | The achievement ID | "streak_master" |
| `earned_at` | ISO timestamp | "2026-02-12T09:15:00Z" |
| `epoch` | The week it was earned | "12" |
| `stat_value` | The triggering stat value | "10" |

---

## Achievements

| ID | Name | How to Earn |
|---|---|---|
| `boss_slayer` | Boss Slayer | Defeat the Protocol Raid boss |
| `streak_master` | Streak Legend | Reach 10+ consecutive mission successes |
| `deep_explorer` | Deep Explorer | Complete 50+ lifetime missions |
| `raid_victor` | Raid Victor | Successfully complete any guild raid |
| `epoch_champion` | Epoch Champion | Finish #1 on the weekly leaderboard |

---

## Architecture

### Minting Authority

The server holds a keypair that acts as both **update authority** and **payer** for all mints. This keypair is loaded from the `MINT_KEYPAIR` environment variable (base58-encoded secret key) or auto-generated to `apps/api/data/mint-keypair.json` on first startup.

### Collections

Two Metaplex Core collections are created on first server startup:

- **"Solana Idle: Relics"** — collection for all relic NFT drops
- **"Solana Idle: Achievements"** — collection for all achievement badges

Collection addresses are persisted to `apps/api/data/collections.json` so they are reused across restarts.

### Mint Flow

```
Player completes mission
  → Server resolves rewards (RNG)
  → If NFT drop: record pending claim in DB
  → Player taps "Claim" in inventory
  → Server calls mintRelic() via Umi
  → Metaplex Core asset minted to player wallet
  → mintAddress saved to DB
  → Player sees Explorer link in Trophy Case
```

For achievements:

```
Player action triggers stat update
  → achievement-service checks all eligibility rules
  → If newly eligible: mintBadge() via Umi
  → Badge appears in Trophy Case automatically
```

### Key Design Decisions

- **Server mints directly to player wallet** — zero player signatures needed, zero UX friction
- **Umi framework** with `@metaplex-foundation/mpl-core` for all Metaplex interactions
- **Attributes plugin** stores game context on-chain, not just in off-chain metadata
- **Metadata served by API** at standard Metaplex JSON endpoints for marketplace compatibility

---

## Key Files

```
apps/api/src/services/metaplex-service.ts   — Umi setup, ensureCollections(), mintRelic(), mintBadge()
apps/api/src/services/achievement-service.ts — Achievement definitions, eligibility checks, auto-grant
apps/api/src/routes/nft-routes.ts            — GET /nfts (player's trophies), GET /nfts/metadata/:type/:id
apps/api/src/routes/claims.ts                — Relic claim with real minting
apps/web/src/hooks/useNfts.ts                — Frontend data fetching
apps/web/src/features/game/TrophyCase.tsx    — Trophy case UI component
```

---

## API Endpoints

### `GET /api/nfts`

Returns all on-chain assets for the authenticated player.

**Response:**

```json
{
  "relics": [
    {
      "id": "claim_abc123",
      "itemName": "Genesis Block Badge",
      "sourceMission": "deep_scan",
      "epoch": 12,
      "playerLevel": 7,
      "droppedAt": "2026-02-10T14:30:00Z",
      "mintAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "claimed": true
    }
  ],
  "badges": [
    {
      "achievement": "streak_master",
      "name": "Streak Legend",
      "earnedAt": "2026-02-12T09:15:00Z",
      "epoch": 12,
      "statValue": 10,
      "mintAddress": "9yMwSPk4WbGJfS7gEhBcX3qPfRHaKb8VmTgLxN2oRuEF"
    }
  ]
}
```

### `POST /api/claims/:id/mint`

Claims a pending relic NFT. Mints a Metaplex Core asset to the player's wallet.

**Response:**

```json
{
  "success": true,
  "mintAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
}
```

### `GET /api/nfts/metadata/:type/:id`

Public endpoint. Returns Metaplex-standard JSON metadata for a minted asset. Used by wallets and marketplaces to display NFT information.

**Response:**

```json
{
  "name": "Genesis Block Badge",
  "description": "A rare relic dropped during a deep scan mission in Solana Idle.",
  "image": "https://solanaidle.app/assets/relics/genesis-block-badge.png",
  "attributes": [
    { "trait_type": "item_name", "value": "Genesis Block Badge" },
    { "trait_type": "source_mission", "value": "deep_scan" },
    { "trait_type": "epoch", "value": "12" },
    { "trait_type": "player_level", "value": "7" },
    { "trait_type": "dropped_at", "value": "2026-02-10T14:30:00Z" }
  ]
}
```

---

## Frontend: Trophy Case

The Trophy Case is located in the **Inventory tab** and serves as the player's permanent collection display.

- **Achievement badges** shown with icons, names, and earned dates
- **Collected relics** shown with source mission info and rarity
- **Minted items** display clickable Solana Explorer links
- **Empty state** encourages gameplay with hints about how to earn trophies
- Pending (unminted) relics show a "Claim" button that triggers the mint

---

## Graceful Degradation

The game is designed to function fully even when minting is unavailable:

- If the mint keypair is not funded or collections fail to create, the game still works — all progression, missions, and rewards function normally
- Claims are marked as claimed in the database even if the on-chain mint fails (`mintAddress` will be `null`)
- `isMintingAvailable()` is checked before attempting any mint operation, preventing unnecessary failed transactions
- Players are never blocked from gameplay by NFT infrastructure issues

---

## Hackathon Track Alignment

### Dynamic & Upgradeable Game Assets

Metaplex Core assets with rich **on-chain attributes** that record full game context — not just a static image, but a data-rich artifact that captures the exact circumstances of how it was earned (mission type, epoch, player level, timestamp).

### On-chain Progression Systems

Achievement badges create a **permanent on-chain record** of player milestones. A player's wallet tells the story of their gameplay history: boss kills, streak records, exploration depth, raid victories, and leaderboard dominance.

### Key Differentiators

- **Zero UX friction** — server mints directly to player wallet, no transaction signing or approval needed from the player
- **Universally viewable** — assets appear in Phantom, Magic Eden, Tensor, and all Solana wallets and marketplaces
- **Meaningful on-chain data** — attributes are stored on-chain via the Attributes plugin, not just in off-chain JSON
- **Survives resets** — while game state resets weekly by epoch, on-chain assets are permanent proof of accomplishment
