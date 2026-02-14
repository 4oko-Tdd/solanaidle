# API Reference — Solana Idle

Base URL: `http://localhost:3000/api`

## Authentication

All authenticated endpoints require:
```
Authorization: Bearer <signed-message-token>
```

Sign-in flow:
1. Client requests a nonce from `/auth/nonce`
2. Client signs the nonce with wallet (`signMessage`)
3. Client sends signature to `/auth/verify`
4. Server returns a session token (JWT)

## Endpoints

### Auth

#### `GET /auth/nonce`
Get a challenge nonce for wallet sign-in.

**Response:**
```json
{
  "nonce": "Sign this message to verify your wallet: abc123..."
}
```

#### `POST /auth/verify`
Verify wallet signature and get session token.

**Body:**
```json
{
  "publicKey": "...",
  "signature": "...",
  "nonce": "..."
}
```

**Response:**
```json
{
  "token": "eyJ..."
}
```

---

### Character

#### `GET /character`
Get current player's character.

**Response:**
```json
{
  "id": "...",
  "walletAddress": "...",
  "level": 3,
  "xp": 450,
  "hp": 100,
  "gearLevel": 2,
  "state": "idle",
  "reviveAt": null
}
```

#### `POST /character`
Create a new character (first time only).

**Response:**
```json
{
  "id": "...",
  "level": 1,
  "xp": 0,
  "hp": 100,
  "gearLevel": 1,
  "state": "idle"
}
```

---

### Missions

#### `GET /missions`
List available mission types.

**Response:**
```json
[
  {
    "id": "scout",
    "name": "Scout",
    "duration": 3600,
    "failRate": 10,
    "rewards": { "xpRange": [10, 25], "scrap": [5, 15] }
  },
  {
    "id": "expedition",
    "name": "Expedition",
    "duration": 21600,
    "failRate": 25,
    "rewards": { "xpRange": [50, 120], "scrap": [20, 50], "crystal": [3, 10] }
  },
  {
    "id": "deep_dive",
    "name": "Deep Dive",
    "duration": 86400,
    "failRate": 40,
    "rewards": { "xpRange": [150, 400], "scrap": [50, 150], "crystal": [10, 30], "artifact": [0, 2], "nftChance": 5 }
  }
]
```

#### `POST /missions/start`
Start a mission.

**Body:**
```json
{
  "missionId": "scout"
}
```

**Response:**
```json
{
  "activeMission": {
    "missionId": "scout",
    "startedAt": "2025-01-15T10:00:00Z",
    "endsAt": "2025-01-15T11:00:00Z"
  }
}
```

#### `GET /missions/active`
Get current active mission (if any).

**Response:**
```json
{
  "activeMission": {
    "missionId": "expedition",
    "startedAt": "2025-01-15T08:00:00Z",
    "endsAt": "2025-01-15T14:00:00Z",
    "timeRemaining": 7200
  }
}
```

#### `POST /missions/claim`
Claim completed mission result.

**Response (success):**
```json
{
  "result": "success",
  "rewards": {
    "xp": 85,
    "scrap": 32,
    "crystal": 7
  },
  "nftDrop": null,
  "character": { "level": 3, "xp": 535, "state": "idle" }
}
```

**Response (failure):**
```json
{
  "result": "failure",
  "rewards": null,
  "nftDrop": null,
  "character": { "state": "dead", "reviveAt": "2025-01-15T15:00:00Z" }
}
```

---

### Inventory

#### `GET /inventory`
Get player's resources.

**Response:**
```json
{
  "scrap": 142,
  "crystal": 23,
  "artifact": 1
}
```

---

### Upgrades

#### `GET /upgrades`
Get available upgrades and costs.

**Response:**
```json
{
  "currentGearLevel": 2,
  "nextUpgrade": {
    "level": 3,
    "cost": { "scrap": 50, "crystal": 15 },
    "failRateReduction": 5,
    "canAfford": true
  }
}
```

#### `POST /upgrades/gear`
Upgrade gear level.

**Response:**
```json
{
  "gearLevel": 3,
  "inventory": { "scrap": 92, "crystal": 8, "artifact": 1 }
}
```

---

### NFT Claims

#### `GET /claims`
List pending NFT claims.

**Response:**
```json
[
  {
    "id": "claim_abc",
    "missionId": "deep_dive",
    "nftName": "Shadow Explorer Badge",
    "claimedAt": null
  }
]
```

#### `POST /claims/:id/mint`
Initiate NFT mint. Returns a transaction for the wallet to sign.

**Response:**
```json
{
  "transaction": "<base64-encoded-transaction>",
  "message": "Sign to claim your Shadow Explorer Badge"
}
```

---

## Error Responses

All errors follow:
```json
{
  "error": "MISSION_IN_PROGRESS",
  "message": "Character is already on a mission"
}
```

---

### Jupiter Quests (Network Intel)

All endpoints require auth. Powered by Jupiter API.

#### `GET /quests/status`
Get all quest progress and active boosts for the authenticated player.

**Response:** `QuestStatus` — array of quests with completion status + active boosts.

#### `POST /quests/price-scout`
Complete the "Price Scout" daily quest — check a token's live price.

**Body:** `{ "mint": "<token mint address>" }`

#### `POST /quests/token-scan`
Complete the "Token Scan" daily quest — look up token info.

**Body:** `{ "query": "<token name or symbol>" }`

#### `POST /quests/portfolio-check`
Complete the "Portfolio Check" daily quest — review wallet holdings via Jupiter.

**Body:** none (uses authenticated wallet)

#### `POST /quests/pnl-report`
Complete the "PnL Report" daily quest — check profit & loss.

**Body:** none (uses authenticated wallet)

#### `GET /quests/swap-order`
Get an unsigned swap transaction from Jupiter Ultra API.

**Query params:** `inputMint`, `outputMint`, `amount`

#### `POST /quests/micro-swap`
Complete the "Micro Swap" weekly quest after executing a swap.

**Body:** `{ "signature": "<transaction signature>" }`

#### `GET /quests/predictions`
List active prediction market events from Jupiter.

#### `POST /quests/prediction-bet`
Complete the "Market Prediction" weekly quest after placing a bet.

**Body:** `{ "marketId": "<market ID>", "signature": "<transaction signature>" }`

---

Common error codes:
- `UNAUTHORIZED` — missing or invalid token
- `CHARACTER_NOT_FOUND` — no character created yet
- `MISSION_IN_PROGRESS` — already on a mission
- `MISSION_NOT_COMPLETE` — timer hasn't finished
- `CHARACTER_DEAD` — character is in revive cooldown
- `INSUFFICIENT_RESOURCES` — can't afford upgrade
- `MAX_GEAR_LEVEL` — already at max gear
- `CLAIM_NOT_FOUND` — invalid claim ID
- `ALREADY_CLAIMED` — NFT already minted
