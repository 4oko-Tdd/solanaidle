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

    // Exposed as finalize_progress to avoid name collision with finalize_boss
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

    // Exposed as finalize_boss to avoid name collision with finalize_progress
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
