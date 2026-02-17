# MagicBlock Integration

Solana Idle integrates **two MagicBlock products** to bring game mechanics on-chain without sacrificing idle game UX.

In the game's cyberpunk narrative, the player is a **node operator** running missions on the Solana network. MagicBlock provides the trustless infrastructure that makes this world feel real — verifiable randomness for epoch rewards and on-chain progress that anyone can audit.

| Product | What It Does | When It Runs |
|---------|-------------|--------------|
| **Verifiable Randomness (VRF)** | Provably fair bonus rolls | Once per epoch (weekly) |
| **Ephemeral Rollups (ER)** — Progress | Zero-fee on-chain progress tracking | Every mission claim |
| **Ephemeral Rollups (ER)** — Boss HP | Real-time boss HP broadcast via websocket | Every damage tick + OVERLOAD |

---

## Why MagicBlock?

An idle game has a simple flow: **open → tap → close → wait → repeat**. Any friction (wallet popups, transaction fees, confirmation delays) kills the experience.

MagicBlock solves this:

- **VRF** gives us provably fair randomness without trusting the server — players can verify their bonus roll on Solana Explorer
- **Ephemeral Rollups** let us write game progress on-chain for free (zero SOL fees, instant confirmation) — the player never signs an extra transaction
- Both products piggyback onto transactions the player **already signs** (epoch start and epoch end) — **zero additional wallet popups**

### Hackathon Alignment

This project targets the **"Solana On-Chain & Real-Time Gaming by MagicBlock"** sub-hackathon, specifically the **"Randomized & Verifiable Game Mechanics"** track. We demonstrate:

1. Verifiable randomness for epoch bonus rewards (VRF)
2. On-chain game state via Ephemeral Rollups (ER)
3. Both integrated with zero UX friction — critical for mobile idle games

### Cross-Integration with Metaplex Core

VRF bonus rolls can trigger NFT drops — when they do, the NFT is minted as a **Metaplex Core** asset with on-chain attributes recording the VRF source. This creates a provably fair chain: VRF roll → NFT drop → Core asset with verifiable origin. See [METAPLEX.md](./METAPLEX.md).

---

## VRF — Epoch Bonus Rewards

### What It Does

When a player **finalizes their weekly epoch**, they roll for bonus rewards using MagicBlock's Verifiable Random Function. The randomness is generated on-chain by MagicBlock's oracle — anyone can verify it wasn't manipulated.

### Flow

```
Player taps "Finalize & Roll"
    │
    ├─ 1. Frontend builds request_randomness tx
    ├─ 2. Player signs with wallet (already signing for epoch end)
    ├─ 3. MagicBlock oracle generates verified random bytes → writes to PDA
    ├─ 4. Frontend polls PDA (~2-3 seconds)
    ├─ 5. Backend reads PDA, derives bonus rewards
    └─ 6. Player sees bonus: multiplier + loot + NFT chance
```

### Reward Probabilities

| Reward | Probability | Source |
|--------|-------------|--------|
| 1.0x multiplier | 70% | VRF byte[0]: 0-179 |
| 1.5x multiplier | 20% | VRF byte[0]: 180-229 |
| 2.0x multiplier | 8% | VRF byte[0]: 230-249 |
| 3.0x multiplier | 2% | VRF byte[0]: 250-255 |
| Tier I loot | 70% | VRF byte[1]: 0-179 |
| Tier II loot | 24% | VRF byte[1]: 180-239 |
| Tier III loot | 6% | VRF byte[1]: 240-255 |
| NFT drop | ~5% | VRF byte[2]: 0-12 |

### Why Only Weekly?

VRF requires a Solana transaction signed by the player. Requiring this per mission would mean signing every time you claim — ruining the idle game UX. Instead, VRF runs once per week at the meaningful moment: epoch finalization.

Regular mission outcomes (success/fail, loot drops) use server-side randomness. The game is server-authoritative by design.

### On-Chain Program: `vrf-roller`

```rust
// Seeds: ["vrf_result", player_pubkey]
pub struct VrfResult {
    pub player: Pubkey,        // who requested
    pub randomness: [u8; 32],  // oracle's random bytes
    pub status: u8,            // 0=pending, 1=fulfilled
    pub created_at: i64,
    pub bump: u8,
}
```

**Instructions:**
- `request_randomness` — Player signs. Creates/resets PDA, CPIs to MagicBlock VRF oracle.
- `consume_randomness` — Oracle callback. Writes verified random bytes into PDA.

### Verification

Every VRF-powered bonus includes a **Solana Explorer link** so the player (or anyone) can verify the randomness on-chain. The `vrfVerified` flag in the API response distinguishes true on-chain VRF from server fallback.

---

## Ephemeral Rollups — On-Chain Progress

### What It Does

Player progress (score, missions completed, deaths, boss kills) is tracked on-chain via MagicBlock Ephemeral Rollups. ERs are a Solana scaling layer that provides **zero-fee, instant transactions** while maintaining settlement on Solana's base layer.

The progress PDA is a **verifiable mirror** of server state. The API server remains authoritative for game logic — ERs provide a trustless on-chain record.

### Flow

```
Epoch Start (player signs 1 tx — class pick)
    └─ Initialize PlayerProgress PDA + delegate to ER
        (bundled into same tx — no extra popup)

During Epoch (0 signatures, days/weeks of play)
    └─ Backend updates progress PDA on ER after each mission
        (free, instant, server signs with backend keypair)

Epoch End (player signs 1 tx — VRF finalize)
    └─ Commit PDA back to Solana + undelegate
        (bundled into same tx — no extra popup)
    └─ Score is now verifiable on Solana Explorer
```

**Total extra wallet signatures: 0.**

### On-Chain Program: `progress-tracker`

```rust
// Seeds: ["progress", player_pubkey, week_start_bytes]
pub struct PlayerProgress {
    pub player: Pubkey,
    pub week_start: i64,
    pub class_id: u8,           // 0=scout, 1=guardian, 2=mystic
    pub score: u64,
    pub missions_completed: u32,
    pub deaths: u32,
    pub boss_defeated: bool,
    pub last_update: i64,
    pub bump: u8,
}
```

**Instructions:**
- `initialize_and_delegate` — Create PDA + delegate to ER (epoch start)
- `update_progress` — Update score/missions/deaths on ER (backend, free)
- `finalize_and_commit` — Commit to Solana + undelegate (epoch end)

### What Stays Off-Chain

Everything gameplay-related:
- Mission timers, start/claim logic
- RNG (success/fail, loot drops, reward variance)
- Inventory, upgrades, skill tree
- Guild, raids
- Boss participant details (who joined, individual contributions, overload status)

The server is the source of truth. ER provides a verifiable attestation layer + real-time broadcast.

---

## Ephemeral Rollups — Real-Time Boss HP

### What It Does

Boss HP is tracked on-chain via a **single global BossState PDA** per week. All players subscribe to this one account via websocket and see HP updates instantly when any player deals damage or uses OVERLOAD.

### Why a Separate Program?

The `boss-tracker` program is separate from `progress-tracker` because:
- **Different PDA seeding:** progress = `[player, week_start]` (per-player); boss = `[week_start]` (one global)
- **Different delegation lifecycle:** progress = per-epoch; boss = per-weekend
- **Different write pattern:** progress = many PDAs, one writer each; boss = one PDA, one writer (server)

### Flow

```
Boss Spawn (Saturday 00:00 UTC):
  Server → SQLite INSERT → Base Layer (init BossState PDA + delegate to ER)

Player Joins (POST /boss/join):
  Server → SQLite INSERT participant
  → ER: apply_damage(delta=0, count++) → websocket → all frontends

Passive Damage Tick (every GET /boss poll, ~30s):
  Server → SQLite recalc all passive damage
  → ER: apply_damage(delta) → websocket → all frontends see HP drop

OVERLOAD (POST /boss/overload):
  Server → SQLite (zero inventory, record crit)
  → ER: apply_damage(crit_delta) → websocket → instant HP drop in all tabs

Boss Dies / Weekend Ends:
  Server → SQLite (killed=1)
  → ER: finalize_and_commit (commit PDA to base layer + undelegate)
```

### On-Chain Program: `boss-tracker`

```rust
// Seeds: ["boss", week_start_bytes]
pub struct BossState {
    pub authority: Pubkey,       // 32 — server keypair (sole writer)
    pub week_start: i64,         // 8
    pub max_hp: u64,             // 8
    pub current_hp: u64,         // 8
    pub total_damage: u64,       // 8
    pub participant_count: u32,  // 4
    pub killed: bool,            // 1
    pub spawned_at: i64,         // 8
    pub bump: u8,                // 1
}
```

**Instructions:**
- `initialize_and_delegate` — Server creates PDA + delegates to ER at boss spawn
- `apply_damage` — Server pushes damage delta to ER (free, instant). `has_one = authority` constraint. Sets `killed = true` when HP hits 0.
- `finalize_and_commit` — Server commits PDA back to base layer when boss dies or weekend ends

### Frontend Subscription

The frontend hooks (`useBossER.ts`) subscribe to the boss PDA via `connection.onAccountChange()` on the ER validator URL. When the websocket is connected:
- HP updates appear instantly across all clients (no polling delay)
- HTTP polling interval is reduced from 30s to 120s (still needed for player-specific data: `hasJoined`, `overloadUsed`, `playerContribution`)
- A "LIVE" indicator dot appears next to the boss name
- If the websocket disconnects, the frontend falls back to 30s HTTP polling seamlessly

### Resilience

All ER calls are wrapped in try/catch. If the ER is unavailable:
- The game continues via SQLite with 30s HTTP polling (same as before)
- Boss damage is still tracked server-side — no data loss
- When ER comes back, the next damage tick re-syncs the on-chain state

---

## Architecture

```
programs/
  vrf-roller/                    → VRF randomness (Anchor, Solana devnet)
  progress-tracker/              → ER progress tracking (Anchor, Solana devnet)
  boss-tracker/                  → ER real-time boss HP (Anchor, Solana devnet)

apps/web/src/
  hooks/useVrfRoll.ts            → VRF: build tx, sign, poll PDA
  hooks/useEphemeralProgress.ts  → ER: delegation + finalize ix builders
  hooks/useBossER.ts             → ER: websocket subscription to boss PDA
  hooks/useBoss.ts               → Merges on-chain + HTTP boss state
  features/game/RunEndScreen.tsx → 3-phase UX: summary → rolling → bonus reveal
  features/game/ClassPicker.tsx  → Epoch start with ER delegation
  features/game/BossFight.tsx    → Boss UI with LIVE indicator

apps/api/src/
  services/vrf-service.ts       → Read VRF PDA, validate, compute bonus
  services/er-service.ts        → Update progress on ER, read from Solana
  services/boss-er-service.ts   → Boss HP: init, apply_damage, finalize on ER
  services/boss-service.ts      → Boss logic + ER integration calls
  services/mission-service.ts   → Calls ER update after each mission claim
  routes/runs.ts                → Finalize route: VRF + ER commit
  routes/boss-routes.ts         → Boss endpoints + GET /boss/pda
```

## UX Design

The MagicBlock integration is surfaced in the UI with:

- **"Powered by MagicBlock"** branding with logo on VRF roll screens
- **"Progress tracked on-chain via MagicBlock Ephemeral Rollups"** indicator
- **"Verified by MagicBlock VRF"** badge on bonus results
- **Solana Explorer link** for on-chain verification of VRF results

All branding uses the MagicBlock logo (inverted for dark theme).

## Tech Stack

| Component | Technology |
|-----------|-----------|
| VRF SDK | `ephemeral-vrf-sdk` (Rust, `anchor` feature) |
| ER SDK | `ephemeral-rollups-sdk` (Rust, `anchor` feature) |
| Framework | Anchor 0.32.1 |
| Network | Solana devnet |
| Frontend | `@solana/web3.js` + `@solana/wallet-adapter-react` |
| Backend | `@solana/web3.js` for PDA reads and ER tx building |
| ER Router | `https://devnet-router.magicblock.app` |
| ER Validator | `https://devnet-us.magicblock.app` |

## Deployment

Requires: Anchor 0.32.1, Solana CLI 2.3.13, Rust 1.85.0

```bash
# VRF program
cd programs/vrf-roller
anchor build && anchor deploy
# Update program ID in: lib.rs, vrf-service.ts, useVrfRoll.ts

# Progress tracker program
cd programs/progress-tracker
anchor build && anchor deploy
# Update program ID in: lib.rs, er-service.ts, useEphemeralProgress.ts

# Boss tracker program
cd programs/boss-tracker
anchor build && anchor deploy
# Update program ID in: lib.rs, boss-er-service.ts
```
