// Copyright 2022 HoaLe. All rights reserved.

use solana_program::{
    account_info::{
        AccountInfo
    }, 
    entrypoint::ProgramResult, pubkey::Pubkey
};

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    Ok(())
}
