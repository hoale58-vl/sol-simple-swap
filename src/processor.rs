// Copyright 2022 HoaLe. All rights reserved.

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{
        next_account_info, AccountInfo
    },
    program_error::ProgramError,
    msg,
    rent::Rent,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    sysvar::Sysvar,
};
use crate::{
    instruction::{
        SwapInstruction
    },
    error::SwapError::{
        NotRentExempt
    }
};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
struct SwapStore {
    pub admin: Pubkey,
    pub amount_swapped: u64,
}

pub struct SwapProcessor;
impl SwapProcessor {
    pub fn process(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = SwapInstruction::unpack(instruction_data)?;

        match instruction {
            SwapInstruction::Initialize { } => {
                msg!("Instruction: Initialize");
                Self::process_init(accounts, program_id)
            }
            SwapInstruction::Withdraw { amount } => {
                msg!("Instruction: Withdraw");
                Self::process_withdraw(accounts, amount, program_id)
            }
            SwapInstruction::Swap { } => {
                msg!("Instruction: Swap");
                Self::process_swap(accounts, program_id)
            }
        }
    }

    fn process_init(
        accounts: &[AccountInfo],
        program_id: &Pubkey,
    ) -> ProgramResult {
        let accounts_iter = &mut accounts.iter();
        let creator_account = next_account_info(accounts_iter)?;
        let writing_account = next_account_info(accounts_iter)?;
        if !creator_account.is_signer {
            return Err(ProgramError::IncorrectProgramId);
        }
    
        if writing_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }
    
        let mut input_data = SwapStore {
            admin: *creator_account.key,
            amount_swapped: 0,
        };
    
        let rent_exemption = Rent::get()?.minimum_balance(writing_account.data_len());
        if **writing_account.lamports.borrow() < rent_exemption {
            return Err(NotRentExempt.into());
        }
        input_data.serialize(&mut &mut writing_account.try_borrow_mut_data()?[..])?;
        Ok(())
    }

    fn process_withdraw(
        accounts: &[AccountInfo],
        amount: u64,
        program_id: &Pubkey,
    ) -> ProgramResult {
        Ok(())
    }

    fn process_swap(
        accounts: &[AccountInfo],
        program_id: &Pubkey,
    ) -> ProgramResult {
        Ok(())
    }
}
