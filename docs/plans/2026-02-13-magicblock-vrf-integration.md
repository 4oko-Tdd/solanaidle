# MagicBlock VRF Integration

**Date:** 2026-02-13
**Status:** Implemented
**Goal:** Integrate MagicBlock's Verifiable Randomness (VRF) for weekly epoch bonus rewards. Targets the "Randomized & Verifiable Game Mechanics" track of the MagicBlock sub-hackathon.

## Architecture

```
Player finalizes epoch ("Finalize & Roll")
        │
        ▼
┌─ Frontend ──────────────────────┐
│ 1. Build tx: request_randomness │
│ 2. Player signs via wallet      │
│ 3. Send tx to Solana            │
│ 4. Poll PDA for result          │
└────────────┬────────────────────┘
             │ (on-chain)
┌─ Solana ───┴────────────────────┐
│ vrf-roller → CPI → VRF Program │
│ Oracle fulfills → callback      │
│ Random value stored in PDA      │
└────────────┬────────────────────┘
             │
┌─ Frontend ─┴────────────────────┐
│ 5. PDA fulfilled → call API     │
│    POST /runs/:id/finalize      │
│    body: { signature, vrfAccount}│
└────────────┬────────────────────┘
             │
┌─ Backend ──┴────────────────────┐
│ 6. Read PDA from Solana         │
│ 7. Verify: right player, fresh  │
│ 8. Derive epoch bonus from VRF: │
│    - Resource multiplier (1-3x) │
│    - Loot tier drop (T1/T2/T3)  │
│    - NFT drop chance (~5%)      │
│ 9. Grant bonus to inventory     │
│ 10. Return EpochFinalizeResponse│
└─────────────────────────────────┘
```

## Scope

**Uses VRF (weekly epoch finalization):**
- Epoch bonus resource multiplier (1x/1.5x/2x/3x)
- Guaranteed loot drop (tier selected by VRF)
- NFT drop roll (~5% chance)

**Stays Math.random() (per-mission, frequent):**
- Mission success/fail roll
- Reward amount variance
- Loot item selection
- Per-mission loot drop chance

## Design Decision

VRF is used **only at epoch finalization** (once per week) rather than per-mission-claim because:
- Signing a Solana tx every mission claim kills the idle game UX
- One signature per week at the big moment is acceptable
- Still demonstrates verifiable randomness for the hackathon

## On-Chain Program: `vrf-roller`

Location: `programs/vrf-roller/`

### PDA: VrfResult
```rust
// Seeds: ["vrf_result", player_pubkey]
pub struct VrfResult {
    pub player: Pubkey,
    pub randomness: [u8; 32],
    pub status: u8,          // 0=pending, 1=fulfilled
    pub created_at: i64,
    pub bump: u8,
}
```

### Instructions
1. `request_randomness` — Player signs. Creates/resets PDA, CPIs to MagicBlock VRF.
2. `consume_randomness` — Oracle callback. Writes random bytes, sets status=fulfilled.

### Deploy
Requires: Anchor 0.32.1, Solana CLI 2.3.13, Rust 1.85.0
Target: Solana devnet

## Files Created/Modified

### New files
- `programs/vrf-roller/Cargo.toml` + `src/lib.rs` + `Anchor.toml`
- `apps/web/src/hooks/useVrfRoll.ts` — VRF request + poll hook
- `apps/api/src/services/vrf-service.ts` — Read PDA, validate, compute bonus
- `docs/reference/magicblock-vrf-quickstart.md` — SDK reference

### Modified files
- `packages/shared/src/types.ts` — Added EpochBonusRewards, EpochFinalizeResponse types
- `apps/api/src/routes/runs.ts` — Finalize route accepts vrfAccount, returns bonus
- `apps/web/src/features/game/RunEndScreen.tsx` — 3-phase UX (summary → rolling → bonus reveal)

## Bonus Reward Probabilities

**Multiplier (byte[0]):**
- 1.0x: 70% (bytes 0-179)
- 1.5x: 20% (bytes 180-229)
- 2.0x: 8% (bytes 230-249)
- 3.0x: 2% (bytes 250-255)

**Loot Tier (byte[1]):**
- T1: 70% (bytes 0-179)
- T2: 24% (bytes 180-239)
- T3: 6% (bytes 240-255)

**NFT Drop (byte[2]):**
- ~5% chance (bytes 0-12)

## TODO (Deployment)

- [ ] Upgrade local Anchor/Solana/Rust to required versions
- [ ] `anchor build && anchor deploy` to devnet
- [ ] Update program ID in vrf-roller, vrf-service.ts, and useVrfRoll.ts
- [ ] Update VRF program constants (DEFAULT_QUEUE, VRF_PROGRAM_ID) from MagicBlock docs
- [ ] Test end-to-end: epoch finalize → VRF roll → bonus reveal
