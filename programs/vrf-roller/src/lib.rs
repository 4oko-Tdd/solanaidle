use anchor_lang::prelude::*;
use ephemeral_vrf_sdk::anchor::vrf;
use ephemeral_vrf_sdk::instructions::{create_request_randomness_ix, RequestRandomnessParams};
use ephemeral_vrf_sdk::types::SerializableAccountMeta;

declare_id!("3khuFQS11YeGuUUhoxLmz6fPi9Dsu6FahXLyGrzpbhUt");

pub const VRF_RESULT_SEED: &[u8] = b"vrf_result";

/// Status constants
const STATUS_PENDING: u8 = 0;
const STATUS_FULFILLED: u8 = 1;

#[program]
pub mod vrf_roller {
    use super::*;

    /// Initialize or reset the VRF result account and request randomness from MagicBlock.
    /// Player signs this transaction when claiming a mission.
    pub fn request_randomness(ctx: Context<RequestRandomnessCtx>, client_seed: u8) -> Result<()> {
        let vrf_result = &mut ctx.accounts.vrf_result;
        vrf_result.player = ctx.accounts.payer.key();
        vrf_result.randomness = [0u8; 32];
        vrf_result.status = STATUS_PENDING;
        vrf_result.created_at = Clock::get()?.unix_timestamp;
        vrf_result.bump = ctx.bumps.vrf_result;

        msg!(
            "Requesting VRF randomness for player: {}",
            ctx.accounts.payer.key()
        );

        let ix = create_request_randomness_ix(RequestRandomnessParams {
            payer: ctx.accounts.payer.key(),
            oracle_queue: ctx.accounts.oracle_queue.key(),
            callback_program_id: ID,
            callback_discriminator: instruction::ConsumeRandomness::DISCRIMINATOR.to_vec(),
            caller_seed: [client_seed; 32],
            accounts_metas: Some(vec![SerializableAccountMeta {
                pubkey: ctx.accounts.vrf_result.key(),
                is_signer: false,
                is_writable: true,
            }]),
            ..Default::default()
        });

        ctx.accounts
            .invoke_signed_vrf(&ctx.accounts.payer.to_account_info(), &ix)?;

        Ok(())
    }

    /// Callback invoked by the MagicBlock VRF oracle with verified randomness.
    /// The VRF program identity must be the signer (enforced by account constraint).
    pub fn consume_randomness(
        ctx: Context<ConsumeRandomnessCtx>,
        randomness: [u8; 32],
    ) -> Result<()> {
        let vrf_result = &mut ctx.accounts.vrf_result;
        vrf_result.randomness = randomness;
        vrf_result.status = STATUS_FULFILLED;

        msg!(
            "VRF fulfilled for player: {}, first byte: {}",
            vrf_result.player,
            randomness[0]
        );

        Ok(())
    }
}

// -- Accounts --

#[vrf]
#[derive(Accounts)]
pub struct RequestRandomnessCtx<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + VrfResult::INIT_SPACE,
        seeds = [VRF_RESULT_SEED, payer.key().as_ref()],
        bump
    )]
    pub vrf_result: Account<'info, VrfResult>,

    /// The MagicBlock oracle queue (devnet default).
    #[account(mut, address = ephemeral_vrf_sdk::consts::DEFAULT_QUEUE)]
    /// CHECK: Validated by address constraint
    pub oracle_queue: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ConsumeRandomnessCtx<'info> {
    /// VRF program identity — enforces callback comes from MagicBlock VRF via CPI.
    #[account(address = ephemeral_vrf_sdk::consts::VRF_PROGRAM_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,

    #[account(mut)]
    pub vrf_result: Account<'info, VrfResult>,
}

// -- State --

#[account]
#[derive(InitSpace)]
pub struct VrfResult {
    /// The player who requested randomness.
    pub player: Pubkey,     // 32 bytes
    /// The random bytes from the oracle.
    pub randomness: [u8; 32], // 32 bytes
    /// 0 = pending, 1 = fulfilled.
    pub status: u8,          // 1 byte
    /// Unix timestamp of the request.
    pub created_at: i64,     // 8 bytes
    /// PDA bump seed.
    pub bump: u8,            // 1 byte
}
