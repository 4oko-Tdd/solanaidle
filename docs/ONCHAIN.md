# On-Chain Guide

How the Solana programs work, how PDAs are delegated to MagicBlock Ephemeral Rollups, and how to verify on-chain state.

## Overview

Three Anchor programs handle different aspects of on-chain state:

| Program | PDA Seed | Scope | Lifecycle |
|---------|----------|-------|-----------|
| `progress-tracker` | `["progress", player, week_start]` | Per-player, per-epoch | Created at run start, committed at epoch end |
| `boss-tracker` | `["boss", week_start]` | One global per week | Created at boss spawn, committed when boss dies |
| `vrf-roller` | `["vrf_result", player]` | Per-player | Created at epoch finalize for bonus roll |

All ER writes are **server-signed** — players never sign damage or progress transactions. The server keypair (`SERVER_KEYPAIR`) is the sole authority.

SKR monetization actions (Reconnect / Overload Amplifier / Raid License) are documented in `MONETIZATION_PLAN.md` and `API.md`. Current implementation uses wallet-linked SKR balance checks in backend state; on-chain SKR transfer verification is planned.

---

## Ephemeral Rollups (ER) — How It Works

MagicBlock ERs are a Solana scaling layer: zero-fee, instant transactions, with settlement back to Solana base layer.

The lifecycle for every delegated PDA:

```
1. INITIALIZE  — Create PDA on Solana base layer (server pays rent)
2. DELEGATE    — Transfer PDA ownership to ER validator (separate instruction)
3. USE ON ER   — Read/write PDA on the ER (free, instant, server-signed)
4. COMMIT      — Write final state back to Solana base layer + undelegate
```

### Why Split Init + Delegate?

The `#[delegate]` macro's CPI transfers PDA ownership to the delegation program mid-instruction. If Anchor's `Account<'info, T>` tries to serialize back on exit, it fails with `instruction modified data of an account it does not own`.

**Solution:** Two separate instructions in one atomic transaction:

1. `initialize_*` — Uses `Account<'info, T>` (Anchor serialization works fine)
2. `delegate_*` — Uses raw `AccountInfo<'info>` with `#[delegate]` macro (no Anchor serialization)

```rust
// Instruction 1: Anchor creates + serializes the PDA
#[derive(Accounts)]
pub struct InitializeBoss<'info> {
    #[account(init_if_needed, payer = payer, ...)]
    pub boss_state: Account<'info, BossState>,  // safe to serialize
}

// Instruction 2: raw AccountInfo, no Anchor exit serialization
#[delegate]
#[derive(Accounts)]
pub struct DelegateBoss<'info> {
    #[account(mut, del)]
    pub pda: AccountInfo<'info>,  // ownership transfers mid-CPI, no serialize
}
```

### ER Validator Routing

When delegating, you must specify which ER validator receives the PDA. This is passed as a `remaining_account`:

```rust
ctx.accounts.delegate_pda(
    &ctx.accounts.payer,
    &seeds,
    DelegateConfig {
        validator: ctx.remaining_accounts.first().map(|a| a.key()),
        ..Default::default()
    },
)?;
```

The TypeScript service passes `ER_VALIDATOR_PUBKEY` as the last account in the delegate instruction. Available validators:

| URL | Pubkey |
|-----|--------|
| `https://devnet-us.magicblock.app` | `MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd` |
| `https://devnet-eu.magicblock.app` | `MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e` |
| `https://devnet-as.magicblock.app` | `MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57` |

### ER Endpoint Resolution

Before sending transactions to the ER, the service queries the router to find where a PDA is actually delegated:

```typescript
const resp = await fetch("https://devnet-router.magicblock.app", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0", id: 1,
    method: "getDelegationStatus",
    params: [pdaAddress],
  }),
});
// Returns: { isDelegated: true, fqdn: "https://devnet-us.magicblock.app/" }
```

This prevents sending updates to the wrong ER validator.

### Account State Checking

Before initializing a PDA, the service checks its current state on base layer:

| Owner | State | Action |
|-------|-------|--------|
| Delegation program | Already delegated | Skip init, mark as ready |
| Our program | Exists but not delegated | Just delegate (skip init) |
| Does not exist | New | Init + delegate in one tx |

This handles server restarts, re-delegation after undelegation, and edge cases gracefully.

---

## Progress Tracker

### PDA: `PlayerProgress`

```rust
// Seeds: ["progress", player_pubkey, &week_start.to_le_bytes()]
pub struct PlayerProgress {
    pub player: Pubkey,           // 32 — player wallet
    pub week_start: i64,          // 8  — epoch start timestamp
    pub class_id: u8,             // 1  — 0=scout, 1=guardian, 2=mystic
    pub score: u64,               // 8  — cumulative score
    pub missions_completed: u32,  // 4
    pub deaths: u32,              // 4
    pub boss_defeated: bool,      // 1
    pub last_update: i64,         // 8
    pub bump: u8,                 // 1
}
```

Each player gets a separate PDA per weekly epoch.

### Instructions

| Instruction | When | Where | Signer |
|-------------|------|-------|--------|
| `initialize_progress` | Run starts | Base layer | Server |
| `delegate_progress` | Run starts (same tx) | Base layer | Server |
| `update_progress` | After each mission claim | ER | Server |
| `finalize_and_commit` | Epoch ends | ER | Server |

### Data Flow

```
Player starts a run
  → API: startRun() in SQLite
  → API: initializeProgressOnChain()
      → Check base layer account state
      → Build init IX + delegate IX
      → Send to Solana base layer, confirm

Player claims a mission
  → API: claimMission() in SQLite
  → API: updateProgressOnER()
      → Resolve ER endpoint via router
      → Build update_progress IX
      → Simulate on ER, then send + confirm

Epoch ends
  → API: finalizeBossOnChain() (commit + undelegate)
```

### Service File

`apps/api/src/services/er-service.ts`

---

## Boss Tracker

### PDA: `BossState`

```rust
// Seeds: ["boss", &week_start.to_le_bytes()]
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

One global PDA per week, shared across all players.

### Instructions

| Instruction | When | Where | Signer |
|-------------|------|-------|--------|
| `initialize_boss` | Boss spawns (Saturday 00:00 UTC) | Base layer | Server |
| `delegate_boss` | Boss spawns (same tx) | Base layer | Server |
| `apply_damage` | Every damage tick + OVERLOAD | ER | Server |
| `finalize_and_commit` | Boss dies or weekend ends | ER | Server |

### Data Flow

```
Boss spawns
  → API: initializeBossOnChain(weekStart, maxHp)
      → Check base layer account state
      → Build init IX + delegate IX
      → Send to Solana base layer, confirm

Damage tick (every ~30s) or OVERLOAD
  → API: applyDamageOnER(weekStart, totalDamage, participantCount)
      → Compute delta from last on-chain damage
      → Resolve ER endpoint via router
      → Build apply_damage IX
      → Simulate on ER, then send + confirm

Boss dies or weekend ends
  → API: finalizeBossOnChain(weekStart)
      → Resolve ER endpoint
      → Build finalize_and_commit IX
      → Send to ER, confirm
      → PDA data settles back to Solana base layer
```

### Frontend Subscription

`apps/web/src/hooks/useBossER.ts` and `apps/mobile/hooks/use-boss-er.ts` subscribe to the boss PDA via `connection.onAccountChange()` on the ER validator URL. All clients see HP updates in real-time via websocket.

Fallback: if websocket disconnects, frontend uses 30s HTTP polling to `/boss`.

### Service File

`apps/api/src/services/boss-er-service.ts`

---

## VRF Roller

### PDA: `VrfResult`

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

| Instruction | When | Signer |
|-------------|------|--------|
| `request_randomness` | Epoch finalize | Player wallet |
| `consume_randomness` | Oracle callback | MagicBlock oracle |

VRF is the only instruction that requires a **player signature** — it's bundled into the epoch finalize transaction so there's no extra wallet popup.

### Service File

`apps/api/src/services/vrf-service.ts`

---

## Delegation Accounts

The `#[delegate]` macro from `ephemeral-rollups-sdk` requires these additional accounts in every delegate instruction:

| Account | Derivation | Program |
|---------|-----------|---------|
| `buffer_pda` | `["buffer", pda]` | Owner program |
| `delegation_record_pda` | `["delegation", pda]` | Delegation program |
| `delegation_metadata_pda` | `["delegation-metadata", pda]` | Delegation program |
| `pda` | The account being delegated | — |
| `owner_program` | The program that owns the PDA | — |
| `delegation_program` | `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh` | — |
| `system_program` | `11111111111111111111111111111111` | — |

Plus `remaining_accounts[0]` = ER validator pubkey for routing.

---

## Deployed Program IDs

| Program | Address | Network |
|---------|---------|---------|
| `progress-tracker` | `8umphbZnJMMVNqR5QnaMurNCf6TcpbgQV5CWKKbChzcL` | Devnet |
| `boss-tracker` | `AeMcgM2YYj4fFrMGEUvPeS3YcHiaDaUeSXYXjz5382up` | Devnet |
| Delegation Program | `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh` | Devnet |

Server authority: `HLjsjniaFyDJSHs2wKkdbc2W3dqR6coqmRz5YHWYUsV3`

---

## Verification

### Verify ER Script

```bash
# Boss PDA only
pnpm --filter @solanaidle/api exec tsx ../../scripts/verify-er.ts

# Boss + player progress
pnpm --filter @solanaidle/api exec tsx ../../scripts/verify-er.ts <PLAYER_WALLET>
```

### Manual Verification

```bash
# 1. Check delegation status via router
curl -s https://devnet-router.magicblock.app \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getDelegationStatus","params":["<PDA_ADDRESS>"]}' \
  | python3 -m json.tool

# 2. Read account data from ER
curl -s <ER_FQDN> \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getAccountInfo","params":["<PDA_ADDRESS>",{"encoding":"base64"}]}' \
  | python3 -m json.tool

# 3. Check base layer (after commit)
solana account <PDA_ADDRESS> --url devnet
```

ER transactions do **not** appear on Solana Explorer. Use the ER endpoint directly to verify data.

---

## Resilience

All ER calls are wrapped in try/catch. If the ER is unavailable:

- The game continues via SQLite — no data loss
- HTTP polling provides boss HP updates (30s interval)
- When ER comes back, the next damage tick or mission claim re-syncs on-chain state
- `delegatedPdas` tracking resets on server restart; account state checking handles re-initialization
