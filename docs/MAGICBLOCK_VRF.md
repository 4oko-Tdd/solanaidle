# MagicBlock VRF Integration

Solana Idle uses [MagicBlock VRF](https://docs.magicblock.gg/pages/verifiable-randomness-functions-vrfs) for verifiable on-chain randomness, targeting the **"Randomized & Verifiable Game Mechanics"** track of the MagicBlock sub-hackathon.

## How It Works

When a player **finalizes their weekly epoch**, the game rolls for bonus rewards using MagicBlock's Verifiable Random Function (VRF) on Solana. This ensures the randomness is provably fair and tamper-proof — anyone can verify the result on-chain.

### Flow

1. Player taps **"Finalize & Roll"** on the epoch end screen
2. Frontend builds a `request_randomness` transaction → player signs with wallet
3. MagicBlock oracle generates verified random bytes and writes them to a PDA on Solana
4. Frontend polls the PDA until the oracle fulfills (~2-3 seconds)
5. Backend reads the on-chain PDA, validates it, and derives bonus rewards
6. Player sees their bonus: resource multiplier (1x-3x), guaranteed loot drop, and a chance at a rare NFT

### What VRF Determines

| Reward | Probability |
|--------|-------------|
| 1.0x multiplier | 70% |
| 1.5x multiplier | 20% |
| 2.0x multiplier | 8% |
| 3.0x multiplier | 2% |
| Tier I loot | 70% |
| Tier II loot | 24% |
| Tier III loot | 6% |
| NFT drop | ~5% |

### Why Only Weekly?

VRF requires a Solana transaction signed by the player. Requiring this for every mission claim would break the idle game flow. Instead, VRF is used once per week at the meaningful moment — epoch finalization — giving the player an exciting on-chain bonus roll without friction.

Regular mission outcomes (success/fail, loot drops, reward variance) use server-side randomness. The game is server-authoritative by design.

## Architecture

```
programs/vrf-roller/          → Anchor program (Solana devnet)
  src/lib.rs                  → request_randomness + consume_randomness (callback)

apps/web/src/
  hooks/useVrfRoll.ts         → Build tx, sign, poll PDA
  features/game/RunEndScreen  → 3-phase UX: summary → rolling → bonus reveal

apps/api/src/
  services/vrf-service.ts     → Read PDA, validate, compute bonus rewards
  routes/runs.ts              → POST /runs/:id/finalize accepts vrfAccount
```

## On-Chain Program

The `vrf-roller` program stores a `VrfResult` PDA per player:

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

**Instructions:**
- `request_randomness` — Player signs. Creates/resets PDA, CPIs to MagicBlock VRF.
- `consume_randomness` — Oracle callback. Writes verified random bytes into PDA.

## Verification

Every VRF-powered bonus includes a link to verify the randomness on Solana Explorer. The `vrfVerified` flag in the API response indicates whether true on-chain VRF was used (vs. server fallback).

## Tech Stack

- [MagicBlock VRF SDK](https://github.com/magicblock-labs/ephemeral-vrf) (`ephemeral_vrf_sdk`)
- [Anchor Framework](https://www.anchor-lang.com/) 0.32.1
- Solana devnet
- `@solana/web3.js` for PDA reads (backend + frontend)
- `@solana/wallet-adapter-react` for transaction signing

## Deployment

Requires: Anchor 0.32.1, Solana CLI 2.3.13, Rust 1.85.0

```bash
cd programs/vrf-roller
anchor build && anchor deploy
# Update program ID in: lib.rs, vrf-service.ts, useVrfRoll.ts
```
