# MagicBlock Integration

Solana Idle uses **two MagicBlock products** for on-chain game mechanics:

1. **VRF (Verifiable Randomness)** — provably fair epoch bonus rolls
2. **Ephemeral Rollups** — zero-fee on-chain progress tracking

---

## VRF — Verifiable Random Epoch Bonus

When a player **finalizes their weekly epoch**, the game rolls for bonus rewards using [MagicBlock VRF](https://docs.magicblock.gg/pages/verifiable-randomness-functions-vrfs) on Solana. The randomness is provably fair and tamper-proof — anyone can verify the result on-chain.

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

### On-Chain Program: `vrf-roller`

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

---

## Ephemeral Rollups — On-Chain Progress Tracking

Player progress (score, missions, deaths, boss kills) is tracked on-chain via [MagicBlock Ephemeral Rollups](https://docs.magicblock.gg/pages/ephemeral-rollups-ers/how-to-guide/quickstart). ERs provide zero-fee, instant transactions on a Solana-compatible execution layer, with final state committed back to Solana.

### Flow

```
Epoch Start (player signs 1 tx — same as class pick)
  └─ Initialize PlayerProgress PDA + delegate to ER

During Epoch (0 signatures)
  └─ Backend updates progress PDA on ER after each mission (free, instant)

Epoch End (player signs 1 tx — same as VRF finalize)
  └─ Commit progress PDA back to Solana + undelegate
  └─ Score is now verifiable on-chain
```

**Total extra signatures: 0** — delegation is bundled into existing transactions.

### On-Chain Program: `progress-tracker`

```rust
// Seeds: ["progress", player_pubkey, week_start_bytes]
pub struct PlayerProgress {
    pub player: Pubkey,
    pub week_start: i64,
    pub class_id: u8,
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

---

## Why This Design?

**Idle game UX** = open app, tap, close. Wallet popups kill this flow.

- VRF is used **once per week** at epoch finalization — the one big moment
- ER delegation is **bundled** into existing signatures — zero extra popups
- Server remains **authoritative** for game logic (timers, RNG, rewards)
- On-chain state is a **verifiable mirror** — leaderboard scores are trustless

---

## Architecture

```
programs/
  vrf-roller/              → VRF randomness (Anchor, Solana devnet)
  progress-tracker/        → ER progress tracking (Anchor, Solana devnet)

apps/web/src/
  hooks/useVrfRoll.ts      → VRF tx builder + PDA polling
  hooks/useEphemeralProgress.ts → ER delegation + finalize ix builders

apps/api/src/
  services/vrf-service.ts  → Read VRF PDA, compute bonus
  services/er-service.ts   → Update progress on ER, read from Solana
```

## Verification

- VRF bonus includes a **Solana Explorer link** to verify randomness
- Progress PDA is readable on-chain after epoch finalization
- `vrfVerified` flag indicates true on-chain VRF vs server fallback

## Tech Stack

- [MagicBlock VRF SDK](https://github.com/magicblock-labs/ephemeral-vrf) (`ephemeral_vrf_sdk`)
- [MagicBlock ER SDK](https://github.com/magicblock-labs) (`ephemeral-rollups-sdk`)
- [Anchor Framework](https://www.anchor-lang.com/) 0.32.1
- Solana devnet
- `@solana/web3.js` for PDA reads and tx building
- `@solana/wallet-adapter-react` for transaction signing

## Deployment

Requires: Anchor 0.32.1, Solana CLI 2.3.13, Rust 1.85.0

```bash
# VRF program
cd programs/vrf-roller && anchor build && anchor deploy

# Progress tracker program
cd programs/progress-tracker && anchor build && anchor deploy

# Update program IDs in: lib.rs files, vrf-service.ts, er-service.ts, hooks
```
