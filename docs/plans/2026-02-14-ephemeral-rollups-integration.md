# Ephemeral Rollups Integration Plan

**Date:** 2026-02-14
**Status:** Planned
**Goal:** Put player progress on-chain via MagicBlock Ephemeral Rollups (ERs) with zero extra wallet signatures. Combined with VRF, we use 2 of 3 MagicBlock core products.

## Design Principle

Idle game UX = open app, tap, close. No extra wallet popups. We piggyback ER delegation/undelegation onto the two signatures the player already does (epoch start + epoch finalize).

## Architecture

```
Epoch Start (player picks class — already signs 1 tx)
        │
        ├─ Create character run on Solana
        └─ Delegate progress PDA to ER (bundled in same tx)

During Epoch (days/weeks of play — 0 signatures)
        │
        ├─ Player starts mission → API handles it (as today)
        ├─ Player claims mission → API resolves it
        └─ Backend updates progress PDA on ER (free, instant, no signing)
            { score, missionsCompleted, deaths, bossDefeated, lastUpdate }

Epoch End (player taps "Finalize & Roll" — already signs 1 tx)
        │
        ├─ VRF roll for bonus rewards (already implemented)
        └─ Commit + undelegate progress PDA back to Solana
            → Score is now verifiable on-chain
            → Leaderboard reads from Solana
```

**Total extra signatures: 0** — delegation is bundled into existing epoch start/end txs.

## What Goes On-Chain (ER)

A single `PlayerProgress` PDA per player per epoch:

```rust
// Seeds: ["progress", player_pubkey, week_start_bytes]
pub struct PlayerProgress {
    pub player: Pubkey,
    pub week_start: i64,
    pub class_id: u8,        // 0=scout, 1=guardian, 2=mystic
    pub score: u64,
    pub missions_completed: u32,
    pub deaths: u32,
    pub boss_defeated: bool,
    pub last_update: i64,
    pub bump: u8,
}
```

This is a **read-only mirror** of the server state. The API server remains authoritative for game logic (timers, RNG, rewards). The ER PDA is updated after each mission completion so there's a verifiable on-chain record.

## What Stays Off-Chain (API Server)

Everything gameplay-related:
- Mission timers, start/claim logic
- RNG (success/fail, loot drops, reward variance)
- Inventory, upgrades, skill tree
- Guild, raids

These stay server-authoritative. ER is used for **progress attestation**, not game execution.

## Implementation

### Step 1: Anchor Program (`progress-tracker`)

Create `programs/progress-tracker/src/lib.rs`:

```rust
#[ephemeral]
#[program]
pub mod progress_tracker {
    // initialize — create PDA + delegate to ER (called at epoch start)
    // update_progress — update score/missions/deaths (called by backend)
    // finalize — commit + undelegate (called at epoch end)
}
```

Key macros: `#[ephemeral]`, `#[delegate]`, `commit_and_undelegate_accounts()`

### Step 2: Backend ER Service

Create `apps/api/src/services/er-service.ts`:
- Uses `ConnectionMagicRouter` to send update txs to ER
- Backend holds a server keypair (not player's wallet) to sign progress updates
- Called from `mission-service.ts` after each mission claim
- Called from `runs.ts` finalize route to commit + undelegate

### Step 3: Frontend Changes (Minimal)

- `ClassPicker.tsx` — bundle delegation instruction into the epoch start tx
- `RunEndScreen.tsx` — bundle commit+undelegate into the finalize tx
- Add `@magicblock-labs/ephemeral-rollups-sdk` to web dependencies

### Step 4: Leaderboard Enhancement

- Leaderboard reads finalized scores from Solana base layer (after undelegation)
- Each score is verifiable on-chain with the player's pubkey
- Optional: Magic Actions to auto-update a global leaderboard PDA on commit

## Files

### Create
- `programs/progress-tracker/Cargo.toml` + `src/lib.rs` + `Anchor.toml`
- `apps/api/src/services/er-service.ts`

### Modify
- `apps/web/src/features/game/ClassPicker.tsx` — add delegation ix to start tx
- `apps/web/src/features/game/RunEndScreen.tsx` — add commit ix to finalize tx
- `apps/api/src/services/mission-service.ts` — call ER update after claim
- `apps/api/src/routes/runs.ts` — trigger commit+undelegate on finalize
- `packages/shared/src/types.ts` — add on-chain progress types

## Dependencies

**Rust (Anchor program):**
- `anchor-lang = "0.32.1"`
- `ephemeral-rollups-sdk = { version = "0.1", features = ["anchor"] }`

**Backend (Node):**
- `@magicblock-labs/ephemeral-rollups-sdk` — for `ConnectionMagicRouter`
- `@solana/web3.js` — for tx building

**Frontend (React):**
- `@magicblock-labs/ephemeral-rollups-sdk` — for delegation ix helpers

## ER Endpoints

- **Devnet Router:** `https://devnet-router.magicblock.app`
- **ER Validator (US):** `https://devnet-us.magicblock.app`
- **Delegation Program:** `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh`

## Pros

- 0 extra wallet signatures — same UX as today
- Progress is verifiable on-chain (Solana Explorer)
- Uses 2 MagicBlock products (ER + VRF) — strong hackathon story
- ER updates are free and instant
- Server stays authoritative — no rewrite of game logic in Rust
- Leaderboard becomes trustless (scores on-chain)

## Cons

- Backend needs a server keypair to sign ER updates (key management)
- Progress PDA is a mirror (not the source of truth) — could drift if server crashes mid-update
- Depends on MagicBlock ER validator uptime
- Anchor program still needs deployment (same toolchain gap as VRF)

## Deployment Requirements

Same as VRF roller:
- Anchor 0.32.1, Solana CLI 2.3.13, Rust 1.85.0
- `anchor build && anchor deploy` to devnet
- Update program ID in progress-tracker, er-service.ts, frontend
