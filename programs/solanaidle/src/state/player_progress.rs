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
