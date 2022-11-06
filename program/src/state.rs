// Copyright 2022 HoaLe. All rights reserved.

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    pubkey::Pubkey,
};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct SwapStore {
    pub admin: Pubkey,
    pub amount_swapped: u64,
    pub token_funded_account: Pubkey,
}

