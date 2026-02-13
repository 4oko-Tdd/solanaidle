# MagicBlock VRF Quickstart Reference

## Required Software
- Solana 2.3.13, Rust 1.85.0, Anchor 0.32.1, Node 24.10.0

## Dependencies
```bash
cargo add ephemeral_vrf_sdk --features anchor
```

## Full Program Example (Roll Dice)

```rust
use anchor_lang::prelude::*;
use ephemeral_vrf_sdk::anchor::vrf;
use ephemeral_vrf_sdk::instructions::{create_request_randomness_ix, RequestRandomnessParams};
use ephemeral_vrf_sdk::types::SerializableAccountMeta;

declare_id!("YOUR_PROGRAM_ID");

pub const PLAYER: &[u8] = b"playerd";

#[program]
pub mod random_dice {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Initializing player account: {:?}", ctx.accounts.player.key());
        Ok(())
    }

    pub fn roll_dice(ctx: Context<DoRollDiceCtx>, client_seed: u8) -> Result<()> {
        msg!("Requesting randomness...");
        let ix = create_request_randomness_ix(RequestRandomnessParams {
            payer: ctx.accounts.payer.key(),
            oracle_queue: ctx.accounts.oracle_queue.key(),
            callback_program_id: ID,
            callback_discriminator: instruction::CallbackRollDice::DISCRIMINATOR.to_vec(),
            caller_seed: [client_seed; 32],
            accounts_metas: Some(vec![SerializableAccountMeta {
                pubkey: ctx.accounts.player.key(),
                is_signer: false,
                is_writable: true,
            }]),
            ..Default::default()
        }),
        ctx.accounts
            .invoke_signed_vrf(&ctx.accounts.payer.to_account_info(), &ix)?;
        Ok(())
    }

    pub fn callback_roll_dice(
        ctx: Context<CallbackRollDiceCtx>,
        randomness: [u8; 32],
    ) -> Result<()> {
        let rnd_u8 = ephemeral_vrf_sdk::rnd::random_u8_with_range(&randomness, 1, 6);
        msg!("Consuming random number: {:?}", rnd_u8);
        let player = &mut ctx.accounts.player;
        player.last_result = rnd_u8;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init_if_needed, payer = payer, space = 8 + 1, seeds = [PLAYER, payer.key().to_bytes().as_slice()], bump)]
    pub player: Account<'info, Player>,
    pub system_program: Program<'info, System>,
}

#[vrf]
#[derive(Accounts)]
pub struct DoRollDiceCtx<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(seeds = [PLAYER, payer.key().to_bytes().as_slice()], bump)]
    pub player: Account<'info, Player>,
    #[account(mut, address = ephemeral_vrf_sdk::consts::DEFAULT_QUEUE)]
    pub oracle_queue: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct CallbackRollDiceCtx<'info> {
    #[account(address = ephemeral_vrf_sdk::consts::VRF_PROGRAM_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,
    #[account(mut)]
    pub player: Account<'info, Player>,
}

#[account]
pub struct Player {
    pub last_result: u8,
}
```

## Key Constants (from SDK)
- `ephemeral_vrf_sdk::consts::DEFAULT_QUEUE` — Oracle queue address
- `ephemeral_vrf_sdk::consts::VRF_PROGRAM_IDENTITY` — VRF program identity PDA (signer for callbacks)

## SDK Utility Functions
- `ephemeral_vrf_sdk::rnd::random_u8_with_range(&randomness, min, max)` — u8 in range
- `ephemeral_vrf_sdk::rnd::random_u32(&randomness)` — random u32
- `ephemeral_vrf_sdk::rnd::random_bool(&randomness)` — random bool

## TypeScript Test Example

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { RandomDice } from "../target/types/random_dice";

describe("roll-dice", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.RandomDice as Program<RandomDice>;

  it("Initialized player!", async () => {
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });

  it("Do Roll Dice!", async () => {
    const tx = await program.methods.rollDice(0).rpc();
    console.log("Your transaction signature", tx);
    const playerPk = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("playerd"), anchor.getProvider().publicKey.toBytes()],
      program.programId
    )[0];
    let player = await program.account.player.fetch(playerPk, "processed");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("Player PDA: ", playerPk.toBase58());
    console.log("player: ", player);
  });
});
```

## Important Notes
- The `#[vrf]` macro auto-adds VRF accounts to the context
- `invoke_signed_vrf` is provided by the `#[vrf]` macro on the context
- Oracle fulfills callback in ~2-3 seconds on devnet
- `callback_discriminator` uses the Anchor instruction discriminator format
- VRF program identity is a PDA that enforces callbacks come from VRF program via CPI
