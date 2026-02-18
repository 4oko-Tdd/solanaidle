use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;

declare_id!("8umphbZnJMMVNqR5QnaMurNCf6TcpbgQV5CWKKbChzcL");

pub const PROGRESS_SEED: &[u8] = b"progress";

#[ephemeral]
#[program]
pub mod progress_tracker {
    use super::*;

    /// Initialize a new PlayerProgress PDA (base layer only, no delegation).
    /// Called as the first instruction in a tx, followed by delegate_progress.
    pub fn initialize_progress(
        ctx: Context<InitializeProgress>,
        week_start: i64,
        class_id: u8,
    ) -> Result<()> {
        let progress = &mut ctx.accounts.progress;
        progress.player = ctx.accounts.player.key();
        progress.week_start = week_start;
        progress.class_id = class_id;
        progress.score = 0;
        progress.missions_completed = 0;
        progress.deaths = 0;
        progress.boss_defeated = false;
        progress.last_update = Clock::get()?.unix_timestamp;
        progress.bump = ctx.bumps.progress;

        msg!(
            "Progress PDA initialized for player: {}, epoch: {}",
            ctx.accounts.player.key(),
            week_start
        );
        Ok(())
    }

    /// Delegate the PDA to the Ephemeral Rollup.
    /// Called as the second instruction in a tx, after initialize_progress.
    pub fn delegate_progress(
        ctx: Context<DelegateProgress>,
        week_start: i64,
    ) -> Result<()> {
        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &[
                PROGRESS_SEED,
                ctx.accounts.player.key().as_ref(),
                &week_start.to_le_bytes(),
            ],
            DelegateConfig {
                validator: ctx.remaining_accounts.first().map(|a| a.key()),
                ..Default::default()
            },
        )?;

        msg!("Progress PDA delegated to Ephemeral Rollup");
        Ok(())
    }

    /// Update progress after a mission claim.
    /// Called by the backend server on the ER — free, instant, no player signing.
    pub fn update_progress(
        ctx: Context<UpdateProgress>,
        score: u64,
        missions_completed: u32,
        deaths: u32,
        boss_defeated: bool,
    ) -> Result<()> {
        let progress = &mut ctx.accounts.progress;
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

    /// Commit the final progress back to Solana and undelegate.
    /// Called at epoch end — bundled into the finalize tx.
    pub fn finalize_and_commit(ctx: Context<FinalizeAndCommit>) -> Result<()> {
        msg!(
            "Finalizing progress: score={}, missions={}",
            ctx.accounts.progress.score,
            ctx.accounts.progress.missions_completed
        );

        commit_and_undelegate_accounts(
            &ctx.accounts.payer,
            vec![&ctx.accounts.progress.to_account_info()],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;

        msg!("Progress committed to Solana and undelegated");
        Ok(())
    }
}

// ── Accounts ──

#[derive(Accounts)]
#[instruction(week_start: i64)]
pub struct InitializeProgress<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: player wallet (not a signer, just used for PDA seed)
    pub player: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + PlayerProgress::INIT_SPACE,
        seeds = [PROGRESS_SEED, player.key().as_ref(), &week_start.to_le_bytes()],
        bump
    )]
    pub progress: Account<'info, PlayerProgress>,

    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateProgress<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: player wallet (used to reconstruct PDA seeds for delegation)
    pub player: AccountInfo<'info>,

    /// CHECK: the progress PDA to delegate
    #[account(mut, del)]
    pub pda: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UpdateProgress<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub progress: Account<'info, PlayerProgress>,
}

#[commit]
#[derive(Accounts)]
pub struct FinalizeAndCommit<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub progress: Account<'info, PlayerProgress>,

    /// CHECK: Magic context for ephemeral rollup commit
    pub magic_context: AccountInfo<'info>,

    /// CHECK: Magic program for ephemeral rollup
    pub magic_program: AccountInfo<'info>,
}

// ── State ──

#[account]
#[derive(InitSpace)]
pub struct PlayerProgress {
    /// The player's wallet pubkey.
    pub player: Pubkey,         // 32
    /// Epoch start timestamp (week boundary).
    pub week_start: i64,        // 8
    /// Class: 0=scout, 1=guardian, 2=mystic.
    pub class_id: u8,           // 1
    /// Cumulative score this epoch.
    pub score: u64,             // 8
    /// Total missions completed.
    pub missions_completed: u32, // 4
    /// Total deaths.
    pub deaths: u32,            // 4
    /// Whether boss was defeated.
    pub boss_defeated: bool,    // 1
    /// Last update timestamp.
    pub last_update: i64,       // 8
    /// PDA bump seed.
    pub bump: u8,               // 1
}
