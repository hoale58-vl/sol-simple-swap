// Copyright 2022 HoaLe. All rights reserved.

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    pubkey::Pubkey,
    program_pack::{IsInitialized, Sealed},
};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct SwapStore {
    pub is_initialized: bool,
    pub admin: Pubkey,
    pub amount_swapped: u64,
    pub token_funded_account: Pubkey,
}

impl Sealed for SwapStore {}

impl IsInitialized for SwapStore {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}
