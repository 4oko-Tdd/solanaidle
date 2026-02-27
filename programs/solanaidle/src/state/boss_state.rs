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
