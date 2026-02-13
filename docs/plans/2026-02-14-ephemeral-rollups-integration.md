# Ephemeral Rollups Integration Plan

**Date:** 2026-02-14
**Status:** Planned
**Goal:** Move mission execution on-chain via MagicBlock Ephemeral Rollups (ERs) — zero-fee, real-time transactions with Solana settlement.

## Why

Currently all game logic is off-chain (server-authoritative). ERs let us run mission state fully on-chain without fees or confirmation delays, then commit results back to Solana. Combined with VRF at epoch end, we'd use 2 of 3 MagicBlock core products.

## Architecture

```
Player starts mission
        │
        ▼
┌─ On-Chain (ER) ────────────────┐
│ 1. Delegate mission PDA to ER  │
│ 2. Start mission (instant, $0) │
│ 3. Timer check / claim         │
│ 4. Rewards calculation          │
│ 5. Commit result to Solana     │
└────────────────────────────────┘
        │
        ▼
  Solana base layer (settled)
```

## Scope

**Phase 1 — Mission state on ER:**
- Create `mission-runner` Anchor program with mission PDA (player, missionId, startedAt, endsAt, status)
- Add delegation via `ephemeral-rollups-sdk` (`#[delegate]` macro)
- `start_mission` → delegates PDA to ER, writes mission state
- `claim_mission` → validates timer, calculates rewards, commits back to Solana
- Frontend builds + signs delegation tx once, then mission ops are free on ER

**Phase 2 — Session Keys (optional):**
- Player signs once per session → session key handles all mission txs
- Eliminates wallet popups for start/claim actions

**Phase 3 — Guild raids on ER (stretch):**
- Raid state PDA delegated to ER
- Multiple players submit actions in real-time (zero fee)
- Final raid result committed to Solana

## Files to Create

- `programs/mission-runner/Cargo.toml` + `src/lib.rs` + `Anchor.toml`
- `apps/web/src/hooks/useEphemeralMission.ts` — delegation + ER transaction hook
- `apps/api/src/services/er-service.ts` — read committed mission PDAs from Solana

## Files to Modify

- `apps/web/src/features/game/MissionPanel.tsx` — trigger on-chain mission start
- `apps/web/src/features/game/MissionTimer.tsx` — claim via ER
- `packages/shared/src/types.ts` — on-chain mission types

## Dependencies

- `ephemeral-rollups-sdk` (Rust, for Anchor program)
- `@solana/web3.js` (frontend, for ER transaction routing via Magic Router)
- Anchor 0.32.1, Solana CLI 2.3.13, Rust 1.85.0

## Key Details

- Magic Router auto-routes txs to ER or base layer based on delegation status
- Delegated accounts can't be modified on base layer until undelegated
- ER transactions are instant and free
- State commits back to Solana are batched by the ER validator
