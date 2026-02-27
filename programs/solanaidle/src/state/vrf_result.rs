use anchor_lang::prelude::*;

pub const STATUS_PENDING: u8 = 0;
pub const STATUS_FULFILLED: u8 = 1;

#[account]
#[derive(InitSpace)]
pub struct VrfResult {
    pub player: Pubkey,
    pub randomness: [u8; 32],
    pub status: u8,
    pub created_at: i64,
    pub bump: u8,
}
