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
