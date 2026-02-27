# Unified Solana Idle Program Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge the three separate Anchor programs (`progress-tracker`, `vrf-roller`, `boss-tracker`) into one `solanaidle` program to reduce deployment cost and eliminate the overhead of three program accounts.

**Architecture:** A single Anchor program `solanaidle` with a modular `src/` layout — `state/` for account structs, `instructions/` for handlers. The `#[ephemeral]` macro goes on the unified `#[program]` module (covering both ER-delegatable PDAs). The `#[vrf]` macro stays on the account-constraint struct in `instructions/vrf.rs`. Both `ephemeral-rollups-sdk` and `ephemeral-vrf-sdk` coexist in one `Cargo.toml` since they operate at different levels.

**Tech Stack:** Anchor 0.32.1, `ephemeral-rollups-sdk = 0.8.5`, `ephemeral-vrf-sdk = 0.2.3`, Rust 2021 edition. Backend services use `@solana/web3.js` (legacy, preserved as-is — only program IDs and two renamed-instruction discriminators change).

---

## Naming Note

Both `progress-tracker` and `boss-tracker` had an instruction called `finalize_and_commit`. In the unified program these are exposed as `finalize_progress` and `finalize_boss` to avoid a name collision. This changes two Anchor discriminators — the plan handles this in Task 9.

---

### Task 1: Create `programs/solanaidle/` skeleton

**Files:**
- Create: `programs/solanaidle/Cargo.toml`
- Create: `programs/solanaidle/src/lib.rs` (placeholder)
- Create: `programs/solanaidle/src/state/mod.rs`
- Create: `programs/solanaidle/src/instructions/mod.rs`

**Step 1: Create Cargo.toml**

```toml
[package]
name = "solanaidle"
version = "0.1.0"
description = "Unified on-chain program for Solana Idle game"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "solanaidle"

[features]
default = []
cpi = ["no-entrypoint"]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
idl-build = ["anchor-lang/idl-build"]

[profile.release]
overflow-checks = true

[dependencies]
anchor-lang = { version = "0.32.1", features = ["init-if-needed"] }
ephemeral-rollups-sdk = { version = "0.8.5", features = ["anchor", "disable-realloc"] }
ephemeral-vrf-sdk = { version = "0.2.3", features = ["anchor"] }
```

**Step 2: Create placeholder `src/lib.rs`**

```rust
use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod solanaidle {
    use super::*;
}
```

**Step 3: Create `src/state/mod.rs`**

```rust
pub mod boss_state;
pub mod player_progress;
pub mod vrf_result;

pub use boss_state::BossState;
pub use player_progress::PlayerProgress;
pub use vrf_result::{VrfResult, STATUS_FULFILLED, STATUS_PENDING};
```

**Step 4: Create `src/instructions/mod.rs`**

```rust
pub mod boss;
pub mod progress;
pub mod vrf;
```

**Step 5: Commit**

```bash
git add programs/solanaidle/
git commit -m "feat: scaffold unified solanaidle program"
```

---

### Task 2: Write state files

**Files:**
- Create: `programs/solanaidle/src/state/player_progress.rs`
- Create: `programs/solanaidle/src/state/boss_state.rs`
- Create: `programs/solanaidle/src/state/vrf_result.rs`

**Step 1: Write `player_progress.rs`**

```rust
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
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

**Step 2: Write `boss_state.rs`**

```rust
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct BossState {
    pub authority: Pubkey,
    pub week_start: i64,
    pub max_hp: u64,
    pub current_hp: u64,
    pub total_damage: u64,
    pub participant_count: u32,
    pub killed: bool,
    pub spawned_at: i64,
    pub bump: u8,
}
```

**Step 3: Write `vrf_result.rs`**

```rust
use anchor_lang::prelude::*;

pub const STATUS_PENDING: u8 = 0;
pub const STATUS_FULFILLED: u8 = 1;

#[account]
#[derive(InitSpace)]
pub struct VrfResult {
    pub player: Pubkey,
    pub randomness: [u8; 32],
    pub status: u8,
    pub created_at: i64,
    pub bump: u8,
}
```

**Step 4: Commit**

```bash
git add programs/solanaidle/src/state/
git commit -m "feat: add solanaidle state structs"
```

---

### Task 3: Write `instructions/progress.rs`

**Files:**
- Create: `programs/solanaidle/src/instructions/progress.rs`

**Step 1: Write the file**

```rust
use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;

use crate::state::PlayerProgress;

pub const PROGRESS_SEED: &[u8] = b"progress";

pub fn initialize_progress(
    context: Context<InitializeProgressAccountConstraints>,
    week_start: i64,
    class_id: u8,
) -> Result<()> {
    let progress = &mut context.accounts.progress;
    progress.player = context.accounts.player.key();
    progress.week_start = week_start;
    progress.class_id = class_id;
    progress.score = 0;
    progress.missions_completed = 0;
    progress.deaths = 0;
    progress.boss_defeated = false;
    progress.last_update = Clock::get()?.unix_timestamp;
    progress.bump = context.bumps.progress;

    msg!(
        "Progress PDA initialized for player: {}, epoch: {}",
        context.accounts.player.key(),
        week_start
    );
    Ok(())
}

pub fn delegate_progress(
    context: Context<DelegateProgressAccountConstraints>,
    week_start: i64,
) -> Result<()> {
    context.accounts.delegate_pda(
        &context.accounts.payer,
        &[
            PROGRESS_SEED,
            context.accounts.player.key().as_ref(),
            &week_start.to_le_bytes(),
        ],
        DelegateConfig {
            validator: context.remaining_accounts.first().map(|a| a.key()),
            ..Default::default()
        },
    )?;
    msg!("Progress PDA delegated to Ephemeral Rollup");
    Ok(())
}

pub fn update_progress(
    context: Context<UpdateProgressAccountConstraints>,
    score: u64,
    missions_completed: u32,
    deaths: u32,
    boss_defeated: bool,
) -> Result<()> {
    let progress = &mut context.accounts.progress;
    progress.score = score;
    progress.missions_completed = missions_completed;
    progress.deaths = deaths;
    progress.boss_defeated = boss_defeated;
    progress.last_update = Clock::get()?.unix_timestamp;

    msg!(
        "Progress updated: score={}, missions={}, deaths={}",
        score,
        missions_completed,
        deaths
    );
    Ok(())
}

pub fn finalize_and_commit(
    context: Context<FinalizeProgressAccountConstraints>,
) -> Result<()> {
    msg!(
        "Finalizing progress: score={}, missions={}",
        context.accounts.progress.score,
        context.accounts.progress.missions_completed
    );
    commit_and_undelegate_accounts(
        &context.accounts.payer,
        vec![&context.accounts.progress.to_account_info()],
        &context.accounts.magic_context,
        &context.accounts.magic_program,
    )?;
    msg!("Progress committed to Solana and undelegated");
    Ok(())
}

// ── Account Constraints ──

#[derive(Accounts)]
#[instruction(week_start: i64)]
pub struct InitializeProgressAccountConstraints<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: player wallet (not a signer, used for PDA seed only)
    pub player: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        space = PlayerProgress::DISCRIMINATOR.len() + PlayerProgress::INIT_SPACE,
        seeds = [PROGRESS_SEED, player.key().as_ref(), &week_start.to_le_bytes()],
        bump
    )]
    pub progress: Account<'info, PlayerProgress>,

    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateProgressAccountConstraints<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: player wallet (used to reconstruct PDA seeds for delegation)
    pub player: AccountInfo<'info>,

    /// CHECK: the progress PDA to delegate
    #[account(mut, del)]
    pub pda: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UpdateProgressAccountConstraints<'info> {
    pub authority: Signer<'info>,

    #[account(mut)]
    pub progress: Account<'info, PlayerProgress>,
}

#[commit]
#[derive(Accounts)]
pub struct FinalizeProgressAccountConstraints<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub progress: Account<'info, PlayerProgress>,

    /// CHECK: Magic context for ephemeral rollup commit
    pub magic_context: AccountInfo<'info>,

    /// CHECK: Magic program for ephemeral rollup
    pub magic_program: AccountInfo<'info>,
}
```

**Step 2: Commit**

```bash
git add programs/solanaidle/src/instructions/progress.rs
git commit -m "feat: add progress tracker instructions"
```

---

### Task 4: Write `instructions/boss.rs`

**Files:**
- Create: `programs/solanaidle/src/instructions/boss.rs`

**Step 1: Write the file**

```rust
use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;

use crate::state::BossState;

pub const BOSS_SEED: &[u8] = b"boss";

pub fn initialize_boss(
    context: Context<InitializeBossAccountConstraints>,
    week_start: i64,
    max_hp: u64,
) -> Result<()> {
    let boss = &mut context.accounts.boss_state;
    boss.authority = context.accounts.payer.key();
    boss.week_start = week_start;
    boss.max_hp = max_hp;
    boss.current_hp = max_hp;
    boss.total_damage = 0;
    boss.participant_count = 0;
    boss.killed = false;
    boss.spawned_at = Clock::get()?.unix_timestamp;
    boss.bump = context.bumps.boss_state;

    msg!(
        "Boss PDA initialized: week_start={}, max_hp={}",
        week_start,
        max_hp
    );
    Ok(())
}

pub fn delegate_boss(
    context: Context<DelegateBossAccountConstraints>,
    week_start: i64,
) -> Result<()> {
    context.accounts.delegate_pda(
        &context.accounts.payer,
        &[BOSS_SEED, &week_start.to_le_bytes()],
        DelegateConfig {
            validator: context.remaining_accounts.first().map(|a| a.key()),
            ..Default::default()
        },
    )?;
    msg!("Boss PDA delegated to Ephemeral Rollup");
    Ok(())
}

pub fn apply_damage(
    context: Context<ApplyDamageAccountConstraints>,
    damage_delta: u64,
    new_participant_count: u32,
) -> Result<()> {
    let boss = &mut context.accounts.boss_state;
    boss.current_hp = boss.current_hp.saturating_sub(damage_delta);
    boss.total_damage = boss.total_damage.saturating_add(damage_delta);
    boss.participant_count = new_participant_count;

    if boss.current_hp == 0 {
        boss.killed = true;
        msg!("Boss killed! total_damage={}", boss.total_damage);
    } else {
        msg!(
            "Damage applied: delta={}, hp={}/{}",
            damage_delta,
            boss.current_hp,
            boss.max_hp
        );
    }
    Ok(())
}

pub fn finalize_and_commit(
    context: Context<FinalizeBossAccountConstraints>,
) -> Result<()> {
    msg!(
        "Finalizing boss: hp={}/{}, killed={}",
        context.accounts.boss_state.current_hp,
        context.accounts.boss_state.max_hp,
        context.accounts.boss_state.killed
    );
    commit_and_undelegate_accounts(
        &context.accounts.payer,
        vec![&context.accounts.boss_state.to_account_info()],
        &context.accounts.magic_context,
        &context.accounts.magic_program,
    )?;
    msg!("Boss PDA committed to Solana and undelegated");
    Ok(())
}

// ── Account Constraints ──

#[derive(Accounts)]
#[instruction(week_start: i64)]
pub struct InitializeBossAccountConstraints<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        space = BossState::DISCRIMINATOR.len() + BossState::INIT_SPACE,
        seeds = [BOSS_SEED, &week_start.to_le_bytes()],
        bump
    )]
    pub boss_state: Account<'info, BossState>,

    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateBossAccountConstraints<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: the boss PDA to delegate
    #[account(mut, del)]
    pub pda: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ApplyDamageAccountConstraints<'info> {
    pub authority: Signer<'info>,

    #[account(mut, has_one = authority)]
    pub boss_state: Account<'info, BossState>,
}

#[commit]
#[derive(Accounts)]
pub struct FinalizeBossAccountConstraints<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub boss_state: Account<'info, BossState>,

    /// CHECK: Magic context for ephemeral rollup commit
    pub magic_context: AccountInfo<'info>,

    /// CHECK: Magic program for ephemeral rollup
    pub magic_program: AccountInfo<'info>,
}
```

**Step 2: Commit**

```bash
git add programs/solanaidle/src/instructions/boss.rs
git commit -m "feat: add boss tracker instructions"
```

---

### Task 5: Write `instructions/vrf.rs`

**Files:**
- Create: `programs/solanaidle/src/instructions/vrf.rs`

**Step 1: Write the file**

```rust
use anchor_lang::prelude::*;
use ephemeral_vrf_sdk::anchor::vrf;
use ephemeral_vrf_sdk::instructions::{create_request_randomness_ix, RequestRandomnessParams};
use ephemeral_vrf_sdk::types::SerializableAccountMeta;

use crate::state::{VrfResult, STATUS_FULFILLED, STATUS_PENDING};

pub const VRF_RESULT_SEED: &[u8] = b"vrf_result";

pub fn request_randomness(
    context: Context<RequestRandomnessAccountConstraints>,
    client_seed: u8,
) -> Result<()> {
    let vrf_result = &mut context.accounts.vrf_result;
    vrf_result.player = context.accounts.payer.key();
    vrf_result.randomness = [0u8; 32];
    vrf_result.status = STATUS_PENDING;
    vrf_result.created_at = Clock::get()?.unix_timestamp;
    vrf_result.bump = context.bumps.vrf_result;

    msg!(
        "Requesting VRF randomness for player: {}",
        context.accounts.payer.key()
    );

    let ix = create_request_randomness_ix(RequestRandomnessParams {
        payer: context.accounts.payer.key(),
        oracle_queue: context.accounts.oracle_queue.key(),
        callback_program_id: crate::ID,
        callback_discriminator: instruction::ConsumeRandomness::DISCRIMINATOR.to_vec(),
        caller_seed: [client_seed; 32],
        accounts_metas: Some(vec![SerializableAccountMeta {
            pubkey: context.accounts.vrf_result.key(),
            is_signer: false,
            is_writable: true,
        }]),
        ..Default::default()
    });

    context
        .accounts
        .invoke_signed_vrf(&context.accounts.payer.to_account_info(), &ix)?;

    Ok(())
}

pub fn consume_randomness(
    context: Context<ConsumeRandomnessAccountConstraints>,
    randomness: [u8; 32],
) -> Result<()> {
    let vrf_result = &mut context.accounts.vrf_result;
    vrf_result.randomness = randomness;
    vrf_result.status = STATUS_FULFILLED;

    msg!(
        "VRF fulfilled for player: {}, first byte: {}",
        vrf_result.player,
        randomness[0]
    );
    Ok(())
}

// ── Account Constraints ──

#[vrf]
#[derive(Accounts)]
pub struct RequestRandomnessAccountConstraints<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        space = VrfResult::DISCRIMINATOR.len() + VrfResult::INIT_SPACE,
        seeds = [VRF_RESULT_SEED, payer.key().as_ref()],
        bump
    )]
    pub vrf_result: Account<'info, VrfResult>,

    #[account(mut, address = ephemeral_vrf_sdk::consts::DEFAULT_QUEUE)]
    /// CHECK: Validated by address constraint
    pub oracle_queue: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ConsumeRandomnessAccountConstraints<'info> {
    /// VRF program identity — enforces callback comes from MagicBlock VRF via CPI
    #[account(address = ephemeral_vrf_sdk::consts::VRF_PROGRAM_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,

    #[account(mut)]
    pub vrf_result: Account<'info, VrfResult>,
}
```

**Step 2: Commit**

```bash
git add programs/solanaidle/src/instructions/vrf.rs
git commit -m "feat: add VRF roller instructions"
```

---

### Task 6: Write the unified `lib.rs`

**Files:**
- Modify: `programs/solanaidle/src/lib.rs`

**Step 1: Replace placeholder lib.rs**

```rust
use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::ephemeral;

pub mod instructions;
pub mod state;

use instructions::boss::*;
use instructions::progress::*;
use instructions::vrf::*;

declare_id!("11111111111111111111111111111111");

#[ephemeral]
#[program]
pub mod solanaidle {
    use super::*;

    // ── Progress Tracker ──

    pub fn initialize_progress(
        context: Context<InitializeProgressAccountConstraints>,
        week_start: i64,
        class_id: u8,
    ) -> Result<()> {
        instructions::progress::initialize_progress(context, week_start, class_id)
    }

    pub fn delegate_progress(
        context: Context<DelegateProgressAccountConstraints>,
        week_start: i64,
    ) -> Result<()> {
        instructions::progress::delegate_progress(context, week_start)
    }

    pub fn update_progress(
        context: Context<UpdateProgressAccountConstraints>,
        score: u64,
        missions_completed: u32,
        deaths: u32,
        boss_defeated: bool,
    ) -> Result<()> {
        instructions::progress::update_progress(
            context,
            score,
            missions_completed,
            deaths,
            boss_defeated,
        )
    }

    // Renamed from finalize_and_commit to avoid collision with boss version
    pub fn finalize_progress(
        context: Context<FinalizeProgressAccountConstraints>,
    ) -> Result<()> {
        instructions::progress::finalize_and_commit(context)
    }

    // ── Boss Tracker ──

    pub fn initialize_boss(
        context: Context<InitializeBossAccountConstraints>,
        week_start: i64,
        max_hp: u64,
    ) -> Result<()> {
        instructions::boss::initialize_boss(context, week_start, max_hp)
    }

    pub fn delegate_boss(
        context: Context<DelegateBossAccountConstraints>,
        week_start: i64,
    ) -> Result<()> {
        instructions::boss::delegate_boss(context, week_start)
    }

    pub fn apply_damage(
        context: Context<ApplyDamageAccountConstraints>,
        damage_delta: u64,
        new_participant_count: u32,
    ) -> Result<()> {
        instructions::boss::apply_damage(context, damage_delta, new_participant_count)
    }

    // Renamed from finalize_and_commit to avoid collision with progress version
    pub fn finalize_boss(
        context: Context<FinalizeBossAccountConstraints>,
    ) -> Result<()> {
        instructions::boss::finalize_and_commit(context)
    }

    // ── VRF Roller ──

    pub fn request_randomness(
        context: Context<RequestRandomnessAccountConstraints>,
        client_seed: u8,
    ) -> Result<()> {
        instructions::vrf::request_randomness(context, client_seed)
    }

    pub fn consume_randomness(
        context: Context<ConsumeRandomnessAccountConstraints>,
        randomness: [u8; 32],
    ) -> Result<()> {
        instructions::vrf::consume_randomness(context, randomness)
    }
}
```

**Step 2: Commit**

```bash
git add programs/solanaidle/src/lib.rs
git commit -m "feat: add unified solanaidle lib.rs with all instructions"
```

---

### Task 7: Generate program ID and update Anchor.toml

**Files:**
- Modify: `programs/solanaidle/src/lib.rs` (update declare_id!)
- Modify: `Anchor.toml`

**Step 1: Generate a new program keypair**

```bash
cd programs/solanaidle
solana-keygen new -o solanaidle-keypair.json --no-bip39-passphrase
PROGRAM_ID=$(solana-keygen pubkey solanaidle-keypair.json)
echo "New program ID: $PROGRAM_ID"
```

**Step 2: Update `Anchor.toml`** — replace the three old entries with one:

```toml
[programs.devnet]
solanaidle = "<PROGRAM_ID from step 1>"
```

Remove the old entries:
```toml
# REMOVE these:
# progress_tracker = "8umphbZnJMMVNqR5QnaMurNCf6TcpbgQV5CWKKbChzcL"
# vrf_roller = "6poGeFLevD7oDWtY9FYHHXQ669vwJvMRa8R5iT98ESKN"
# boss_tracker = "AeMcgM2YYj4fFrMGEUvPeS3YcHiaDaUeSXYXjz5382up"
```

Also update `[workspace]` — the glob `programs/*` still works since old dirs will be deleted in Task 10.

**Step 3: Update `declare_id!` in `lib.rs`**

Replace:
```rust
declare_id!("11111111111111111111111111111111");
```
With:
```rust
declare_id!("<PROGRAM_ID from step 1>");
```

**Step 4: Commit**

```bash
git add programs/solanaidle/solanaidle-keypair.json Anchor.toml programs/solanaidle/src/lib.rs
git commit -m "feat: generate solanaidle program ID and update Anchor.toml"
```

---

### Task 8: Build the program and verify it compiles

**Step 1: Build from workspace root**

```bash
cd /path/to/solanaidle
anchor build -p solanaidle
```

Expected: compiles successfully, IDL generated at `target/idl/solanaidle.json`.

**Step 2: If it fails, diagnose**

Common issues:
- `#[ephemeral]` and `#[vrf]` macro conflict → check that `#[vrf]` is only on `RequestRandomnessAccountConstraints`, not on the program module
- Missing `use` imports in `lib.rs` — ensure all account constraint types are in scope
- `crate::ID` in `vrf.rs` refers to `declare_id!` value — should resolve correctly in a single-crate program

**Step 3: Confirm IDL has all 10 instructions**

```bash
cat target/idl/solanaidle.json | python3 -c "import json,sys; [print(i['name']) for i in json.load(sys.stdin)['instructions']]"
```

Expected output:
```
initialize_progress
delegate_progress
update_progress
finalize_progress
initialize_boss
delegate_boss
apply_damage
finalize_boss
request_randomness
consume_randomness
```

**Step 4: Commit**

```bash
git add target/idl/solanaidle.json target/types/solanaidle.ts
git commit -m "feat: build solanaidle program and generate IDL"
```

---

### Task 9: Update backend TypeScript services

The only changes needed in TypeScript are:
1. Replace three separate program IDs with one `SOLANAIDLE_PROGRAM_ID`
2. Update the discriminators for `finalize_progress` and `finalize_boss` (renamed from `finalize_and_commit`)
3. Update `owner_program` in delegation PDA derivation helpers

**Step 1: Extract new finalize discriminators from IDL**

```bash
node -e "
const idl = require('./target/idl/solanaidle.json');
const ixs = idl.instructions;
const fp = ixs.find(i => i.name === 'finalize_progress');
const fb = ixs.find(i => i.name === 'finalize_boss');
console.log('finalize_progress discriminator:', JSON.stringify(fp.discriminator));
console.log('finalize_boss discriminator:', JSON.stringify(fb.discriminator));
"
```

Note the hex values — they replace the hardcoded `[0xd4, 0x5a, ...]` in both services.

**Step 2: Update `apps/api/src/services/er-service.ts`**

Replace:
```typescript
const PROGRESS_PROGRAM_ID = new PublicKey(
  "8umphbZnJMMVNqR5QnaMurNCf6TcpbgQV5CWKKbChzcL"
);
```
With:
```typescript
const SOLANAIDLE_PROGRAM_ID = new PublicKey(
  "<new program ID from Task 7>"
);
```

Replace every occurrence of `PROGRESS_PROGRAM_ID` with `SOLANAIDLE_PROGRAM_ID` (in `deriveProgressPda`, `deriveDelegationPdas`, instruction builders, exported constants).

In `buildFinalizeAndCommitIx`, replace the discriminator bytes with the values from Step 1 (`finalize_progress`).

In exported `ER_CONSTANTS`, rename the key:
```typescript
export const ER_CONSTANTS = {
  SOLANAIDLE_PROGRAM_ID: SOLANAIDLE_PROGRAM_ID.toBase58(),
  DELEGATION_PROGRAM_ID: DELEGATION_PROGRAM_ID.toBase58(),
  ER_ROUTER_URL,
  ER_VALIDATOR_URL,
};
```

**Step 3: Update `apps/api/src/services/boss-er-service.ts`**

Replace:
```typescript
const BOSS_PROGRAM_ID = new PublicKey(
  "AeMcgM2YYj4fFrMGEUvPeS3YcHiaDaUeSXYXjz5382up"
);
```
With:
```typescript
const SOLANAIDLE_PROGRAM_ID = new PublicKey(
  "<new program ID from Task 7>"
);
```

Replace every occurrence of `BOSS_PROGRAM_ID` with `SOLANAIDLE_PROGRAM_ID`.

In `buildFinalizeAndCommitIx`, replace the discriminator bytes with the values from Step 1 (`finalize_boss`).

In `deriveBossDelegationPdas`, `owner_program` key uses `SOLANAIDLE_PROGRAM_ID`.

In exported `BOSS_ER_CONSTANTS`:
```typescript
export const BOSS_ER_CONSTANTS = {
  SOLANAIDLE_PROGRAM_ID: SOLANAIDLE_PROGRAM_ID.toBase58(),
  ER_VALIDATOR_URL,
};
```

**Step 4: Update `apps/api/src/services/vrf-service.ts`**

Replace:
```typescript
const VRF_ROLLER_PROGRAM_ID = new PublicKey(
  "6poGeFLevD7oDWtY9FYHHXQ669vwJvMRa8R5iT98ESKN"
);
```
With:
```typescript
const SOLANAIDLE_PROGRAM_ID = new PublicKey(
  "<new program ID from Task 7>"
);
```

Replace `VRF_ROLLER_PROGRAM_ID` with `SOLANAIDLE_PROGRAM_ID` in `deriveVrfResultPda`.

**Step 5: Check TypeScript still compiles**

```bash
pnpm --filter @solanaidle/api build
```

Expected: no type errors.

**Step 6: Commit**

```bash
git add apps/api/src/services/er-service.ts apps/api/src/services/boss-er-service.ts apps/api/src/services/vrf-service.ts
git commit -m "feat: update backend services to use unified solanaidle program ID"
```

---

### Task 10: Delete the three old program directories

**Step 1: Remove old programs**

```bash
rm -rf programs/progress-tracker programs/vrf-roller programs/boss-tracker
```

**Step 2: Verify Anchor still finds the unified program**

```bash
anchor build -p solanaidle
```

Expected: builds without complaints about missing workspace members.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old progress-tracker, vrf-roller, boss-tracker programs"
```

---

## Risk Notes

- **`finalize_progress` / `finalize_boss` discriminator change**: These two instructions are renamed vs the originals. Any pre-existing on-chain transactions or client code referencing `finalize_and_commit` must use the new discriminators from the IDL (Task 9, Step 1).
- **`#[ephemeral]` macro scope**: The macro instruments the entire program module. All ER-related state (progress + boss PDAs) will be delegatable. VRF accounts are not ER-delegatable — this is correct; `VrfResult` doesn't use the delegation flow.
- **PDA seeds unchanged**: `b"progress"`, `b"boss"`, `b"vrf_result"` seeds are identical to the old programs. However since the program ID changes, all PDAs will be at different addresses than the old programs. Since nothing is deployed yet this is fine.
- **`crate::ID` in vrf.rs**: References the new program's `declare_id!`. The VRF callback will call back into the correct unified program.
- **`solanaidle-keypair.json`**: Keep this file safe — it's the deploy authority for the program. Add to `.gitignore` if not already covered.
