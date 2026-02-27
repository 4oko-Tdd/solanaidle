use anchor_lang::prelude::*;
use ephemeral_vrf_sdk::anchor::vrf;
use ephemeral_vrf_sdk::instructions::{create_request_randomness_ix, RequestRandomnessParams};
use ephemeral_vrf_sdk::types::SerializableAccountMeta;

use crate::state::{VrfResult, STATUS_PENDING};

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
        callback_discriminator: crate::instruction::ConsumeRandomness::DISCRIMINATOR.to_vec(),
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
    vrf_result.status = crate::state::STATUS_FULFILLED;

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
