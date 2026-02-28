# API Reference — Seeker Node

Base URL: `http://localhost:3000/api` (local development — web uses `pnpm dev`; Expo mobile app should use `EXPO_PUBLIC_API_URL=http://<LAN_IP>:3000/api` on physical Seeker/Android devices)

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
`skr` is sourced from on-chain SPL token balance for `SKR_MINT_ADDRESS`.

**Response:**
```json
{
  "scrap": 142,
  "crystal": 23,
  "artifact": 1,
  "skr": 120
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

### Boss

#### `GET /boss`
Get current world boss status. Includes player contribution if authenticated. Triggers passive damage recalculation.

**Response:**
```json
{
  "boss": {
    "id": "...",
    "name": "Protocol Leviathan",
    "maxHp": 1000000,
    "currentHp": 847230,
    "weekStart": "2026-02-16T00:00:00.000Z",
    "spawnedAt": "2026-02-14T00:00:00.000Z",
    "killed": false
  },
  "participantCount": 12,
  "totalDamage": 152770,
  "hasJoined": true,
  "overloadUsed": false,
  "playerContribution": 0.15,
  "skrBalance": 120,
  "reconnectUsed": false,
  "overloadAmpUsed": false,
  "raidLicense": true,
  "destabilized": false,
  "monetizationCosts": {
    "reconnect": 25,
    "overloadAmplifier": 18,
    "raidLicense": 35,
    "freeRecoveryMinutes": 15
  }
}
```

Returns `{ "boss": null }` when no boss is active.

#### `POST /boss/join` (auth required)
Join the boss fight. Locks character into `in_boss_fight` state.

**Response:**
```json
{
  "success": true,
  "participant": {
    "bossId": "...",
    "walletAddress": "...",
    "joinedAt": "2026-02-14T12:00:00Z",
    "passiveDamage": 0,
    "critDamage": 0,
    "critUsed": false
  }
}
```

#### `POST /boss/overload` (auth required)
Use OVERLOAD — burns all resources for critical damage. Once per boss fight.

**Response:**
```json
{
  "success": true,
  "damage": 4250
}
```

#### `POST /boss/reconnect` (auth required)
Use paid instant recovery from `destabilized` state (epoch-capped).
`paymentSignature` must be the confirmed devnet tx signature for the SKR transfer from player ATA to treasury ATA.

**Body:**
```json
{
  "paymentSignature": "<devnet_tx_signature>"
}
```

**Response:**
```json
{
  "success": true,
  "skrBalance": 95
}
```

#### `POST /boss/overload-amplifier` (auth required)
Purchase +10% OVERLOAD amplifier for current epoch (once per epoch).
`paymentSignature` must be the confirmed devnet tx signature for the SKR transfer from player ATA to treasury ATA.

**Body:**
```json
{
  "paymentSignature": "<devnet_tx_signature>"
}
```

**Response:**
```json
{
  "success": true,
  "skrBalance": 102
}
```

#### `POST /boss/raid-license` (auth required)
Purchase +5% passive contribution efficiency for current epoch (once per epoch).
`paymentSignature` must be the confirmed devnet tx signature for the SKR transfer from player ATA to treasury ATA.

**Body:**
```json
{
  "paymentSignature": "<devnet_tx_signature>"
}
```

**Response:**
```json
{
  "success": true,
  "skrBalance": 85
}
```

#### `GET /boss/pda`
Get the on-chain boss PDA address for websocket subscription. Public endpoint.

**Response:**
```json
{
  "pda": "BoSS...abc",
  "erValidatorUrl": "https://devnet-us.magicblock.app"
}
```

Frontend uses this to subscribe to the boss PDA via `connection.onAccountChange()` on the ER validator for real-time HP updates.

#### `GET /boss/results` (auth required)
Get boss fight results after boss is killed. Triggers drop rolls for the authenticated player.

**Response:**
```json
{
  "killed": true,
  "participants": [
    { "wallet": "...", "contribution": 0.15, "totalDamage": 23000 }
  ],
  "playerContribution": 0.15,
  "playerDamage": 23000,
  "drops": { "type": "weekly_buff", "buffId": "head_start" }
}
```

---

### Runs & Leaderboard

#### `POST /runs/start` (auth required)
Start a new weekly run. Requires choosing a class. Only one active run per player per epoch.

**Body:**
```json
{ "classId": "scout" }
```

**Response:**
```json
{
  "run": {
    "id": "...",
    "classId": "scout",
    "weekStart": "2026-02-23T00:00:00.000Z",
    "livesRemaining": 3,
    "score": 0,
    "missionsCompleted": 0,
    "bossDefeated": false,
    "active": true,
    "streak": 0
  }
}
```

#### `GET /runs/active` (auth required)
Get the player's current active run.

#### `POST /runs/finalize` (auth required)
Finalize the current run and apply VRF-powered epoch bonus.

**Response:**
```json
{
  "finalized": true,
  "bonus": {
    "multiplier": 1.5,
    "boostedScore": 1500,
    "originalScore": 1000,
    "vrfVerified": true,
    "vrfAccount": "Vrf...abc"
  }
}
```

#### `GET /runs/leaderboard` (public)
Get the leaderboard for the current epoch. Wallet addresses are resolved to `.sol` or `.skr` domain names where available (server-side, cached 24h).

**Response:**
```json
[
  {
    "rank": 1,
    "walletAddress": "HLjs...V3",
    "displayName": "alice.sol",
    "classId": "guardian",
    "score": 4200,
    "missionsCompleted": 18,
    "bossDefeated": true
  },
  {
    "rank": 2,
    "walletAddress": "9xKp...Wz",
    "classId": "scout",
    "score": 3100,
    "missionsCompleted": 14,
    "bossDefeated": false
  }
]
```

`displayName` is present only when a `.sol` or `.skr` domain resolves for the wallet. Falls back to truncated address in the UI.

---

### Guilds

#### `GET /guilds/mine` (auth required)
Get the player's current guild and member list. Member wallet addresses are resolved to domain names where available.

**Response:**
```json
{
  "guild": {
    "id": "...",
    "name": "Phantom Fleet",
    "inviteCode": "XK9M2",
    "createdBy": "HLjs...V3",
    "memberCount": 3
  },
  "members": [
    {
      "walletAddress": "HLjs...V3",
      "characterId": "...",
      "joinedAt": "2026-02-20T10:00:00.000Z",
      "displayName": "alice.sol"
    },
    {
      "walletAddress": "9xKp...Wz",
      "characterId": "...",
      "joinedAt": "2026-02-21T08:00:00.000Z"
    }
  ]
}
```

Returns `{ guild: null, members: [] }` if player has no guild.

#### `POST /guilds` (auth required)
Create a new guild.

**Body:**
```json
{ "name": "Phantom Fleet" }
```

#### `POST /guilds/join` (auth required)
Join a guild by invite code.

**Body:**
```json
{ "inviteCode": "XK9M2" }
```

#### `POST /guilds/leave` (auth required)
Leave the current guild.

---

### Raids

#### `GET /raids/available` (auth required)
List raid missions available to the player's guild.

**Response:**
```json
[
  {
    "id": "outpost",
    "name": "Outpost Raid",
    "requiredPlayers": 2,
    "duration": 7200,
    "lootMultiplier": 2,
    "description": "2-player co-op for 2x loot"
  },
  {
    "id": "stronghold",
    "name": "Stronghold Siege",
    "requiredPlayers": 3,
    "duration": 14400,
    "lootMultiplier": 3,
    "description": "3-player siege for 3x loot"
  }
]
```

#### `POST /raids/start` (auth required)
Start a guild raid.

**Body:**
```json
{ "raidId": "outpost" }
```

#### `GET /raids/active` (auth required)
Get the guild's active raid (if any).

#### `POST /raids/claim` (auth required)
Claim completed raid rewards.

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
- `BOSS_NOT_SPAWNED` — no active boss
- `BOSS_ALREADY_KILLED` — boss already defeated
- `NO_ACTIVE_RUN` — player has no active weekly run
- `ALREADY_JOINED` — already in the boss fight
- `CHARACTER_BUSY` — character not idle
- `NOT_IN_FIGHT` — player not in boss fight (overload)
- `OVERLOAD_ALREADY_USED` — already used overload this fight
- `INSUFFICIENT_SKR` — insufficient SKR balance for action
- `SKR_PAYMENT_SIGNATURE_REQUIRED` — payment tx signature was not provided
- `SKR_PAYMENT_ALREADY_USED` — payment signature replay detected
- `INVALID_SKR_PAYMENT` — tx not confirmed / wrong signer / wrong token movement
- `NODE_NOT_DESTABILIZED` — reconnect requested while node is stable
- `RECONNECT_ALREADY_USED` — reconnect already used this epoch
- `OVERLOAD_AMP_ALREADY_ACTIVE` — overload amplifier already purchased this epoch
- `RAID_LICENSE_ALREADY_ACTIVE` — raid license already purchased this epoch

---

## Dev Endpoints (Non-production)

These routes are only available when API runs with `NODE_ENV !== "production"`.

### Economy / SKR testing

#### `POST /dev/add-skr` (auth required)
Mints `+100 SKR` on devnet to current wallet's associated token account.
Requires `SERVER_KEYPAIR` to be the mint authority for `SKR_MINT_ADDRESS`.

**Response:**
```json
{
  "message": "+100 SKR minted on devnet (now 300)",
  "signature": "<mint_tx_signature>"
}
```

#### `POST /dev/toggle-destabilized` (auth required)
Toggle current epoch `destabilized` flag for current wallet.

#### `POST /dev/toggle-raid-license` (auth required)
Toggle current epoch raid license state.

#### `POST /dev/toggle-overload-amp` (auth required)
Toggle current epoch overload amplifier state.

#### `POST /dev/reset-boss-monetization` (auth required)
Reset current epoch boss monetization state for current wallet.
