use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;

declare_id!("AeMcgM2YYj4fFrMGEUvPeS3YcHiaDaUeSXYXjz5382up");

pub const BOSS_SEED: &[u8] = b"boss";

#[ephemeral]
#[program]
pub mod boss_tracker {
    use super::*;

    /// Initialize a new BossState PDA (base layer only, no delegation).
    /// Called as the first instruction in a tx, followed by delegate_boss.
    pub fn initialize_boss(
        ctx: Context<InitializeBoss>,
        week_start: i64,
        max_hp: u64,
    ) -> Result<()> {
        let boss = &mut ctx.accounts.boss_state;
        boss.authority = ctx.accounts.payer.key();
        boss.week_start = week_start;
        boss.max_hp = max_hp;
        boss.current_hp = max_hp;
        boss.total_damage = 0;
        boss.participant_count = 0;
        boss.killed = false;
        boss.spawned_at = Clock::get()?.unix_timestamp;
        boss.bump = ctx.bumps.boss_state;

        msg!(
            "Boss PDA initialized: week_start={}, max_hp={}",
            week_start,
            max_hp
        );
        Ok(())
    }

    /// Delegate the boss PDA to the Ephemeral Rollup.
    /// Called as the second instruction in a tx, after initialize_boss.
    pub fn delegate_boss(
        ctx: Context<DelegateBoss>,
        week_start: i64,
    ) -> Result<()> {
        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &[BOSS_SEED, &week_start.to_le_bytes()],
            DelegateConfig {
                validator: ctx.remaining_accounts.first().map(|a| a.key()),
                ..Default::default()
            },
        )?;

        msg!("Boss PDA delegated to Ephemeral Rollup");
        Ok(())
    }

    /// Apply damage to the boss on the ER.
    /// Called by the backend server — free, instant, no player signing.
    pub fn apply_damage(
        ctx: Context<ApplyDamage>,
        damage_delta: u64,
        new_participant_count: u32,
    ) -> Result<()> {
        let boss = &mut ctx.accounts.boss_state;
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

    /// Commit the BossState PDA back to Solana base layer and undelegate.
    /// Called when boss dies or weekend ends.
    pub fn finalize_and_commit(ctx: Context<FinalizeAndCommit>) -> Result<()> {
        msg!(
            "Finalizing boss: hp={}/{}, killed={}",
            ctx.accounts.boss_state.current_hp,
            ctx.accounts.boss_state.max_hp,
            ctx.accounts.boss_state.killed
        );

        commit_and_undelegate_accounts(
            &ctx.accounts.payer,
            vec![&ctx.accounts.boss_state.to_account_info()],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;

        msg!("Boss PDA committed to Solana and undelegated");
        Ok(())
    }
}

// ── Accounts ──

#[derive(Accounts)]
#[instruction(week_start: i64)]
pub struct InitializeBoss<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + BossState::INIT_SPACE,
        seeds = [BOSS_SEED, &week_start.to_le_bytes()],
        bump
    )]
    pub boss_state: Account<'info, BossState>,

    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateBoss<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: the boss PDA to delegate
    #[account(mut, del)]
    pub pda: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ApplyDamage<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut, has_one = authority)]
    pub boss_state: Account<'info, BossState>,
}

#[commit]
#[derive(Accounts)]
pub struct FinalizeAndCommit<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub boss_state: Account<'info, BossState>,
}

// ── State ──

#[account]
#[derive(InitSpace)]
pub struct BossState {
    /// Server keypair (sole authority for damage updates).
    pub authority: Pubkey,       // 32
    /// Week start timestamp (Monday 00:00 UTC).
    pub week_start: i64,         // 8
    /// Maximum HP at spawn.
    pub max_hp: u64,             // 8
    /// Current HP (decreases as damage is applied).
    pub current_hp: u64,         // 8
    /// Total cumulative damage dealt.
    pub total_damage: u64,       // 8
    /// Number of participants in the fight.
    pub participant_count: u32,  // 4
    /// Whether the boss has been killed.
    pub killed: bool,            // 1
    /// Timestamp when the boss was spawned.
    pub spawned_at: i64,         // 8
    /// PDA bump seed.
    pub bump: u8,                // 1
}
