// Copyright 2022 HoaLe. All rights reserved.

use crate::processor::SwapProcessor;
use solana_program::{
    account_info::AccountInfo, entrypoint, entrypoint::ProgramResult, pubkey::Pubkey,
};

entrypoint!(process_instruction);
fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    SwapProcessor::process(program_id, accounts, instruction_data)
}