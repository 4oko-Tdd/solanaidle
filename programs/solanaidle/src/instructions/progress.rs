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
