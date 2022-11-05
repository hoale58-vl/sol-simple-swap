// Copyright 2022 HoaLe. All rights reserved.

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{
        next_account_info, AccountInfo
    },
    program_error::ProgramError,
    program::{invoke, invoke_signed},
    msg,
    rent::Rent,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    sysvar::Sysvar,
    program_pack::IsInitialized
};
use crate::{
    instruction::{
        SwapInstruction
    },
    error::SwapError::{
        NotRentExempt
    },
    state::SwapStore
};

const SWAP_RATIO: u64 = 10;

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
        let swap_store_account = next_account_info(accounts_iter)?;
        let token_funded_account = next_account_info(accounts_iter)?;
        let token_program = next_account_info(accounts_iter)?;

        if !creator_account.is_signer {
            return Err(ProgramError::IncorrectProgramId);
        }
        if swap_store_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }
        if *token_funded_account.owner != spl_token::id() {
            return Err(ProgramError::IncorrectProgramId);
        }
    
        let rent_exemption = Rent::get()?.minimum_balance(swap_store_account.data_len());
        if **swap_store_account.lamports.borrow() < rent_exemption {
            return Err(NotRentExempt.into());
        }

        let swap_store = SwapStore::try_from_slice(*swap_store_account.data.borrow())?;
        if swap_store.is_initialized() {
            return Err(ProgramError::AccountAlreadyInitialized);
        }

        let (pda, _nonce) = Pubkey::find_program_address(&[b"mov_swap"], program_id);
        let owner_change_ix = spl_token::instruction::set_authority(
            token_program.key,
            token_funded_account.key,
            Some(&pda),
            spl_token::instruction::AuthorityType::AccountOwner,
            creator_account.key,
            &[&creator_account.key],
        )?;

        msg!("Calling the token program to transfer token account ownership...");
        invoke(
            &owner_change_ix,
            &[
                token_funded_account.clone(),
                creator_account.clone(),
                token_program.clone(),
            ],
        )?;

        let swap_store = SwapStore {
            is_initialized: true,
            admin: *creator_account.key,
            amount_swapped: 0,
            token_funded_account: *token_funded_account.key,
        };
        swap_store.serialize(&mut &mut swap_store_account.try_borrow_mut_data()?[..])?;
        Ok(())
    }

    fn process_swap(
        accounts: &[AccountInfo],
        program_id: &Pubkey,
    ) -> ProgramResult {
        let accounts_iter = &mut accounts.iter();
        let signer_account = next_account_info(accounts_iter)?;
        let token_funded_account = next_account_info(accounts_iter)?;
        let receiver_token_account = next_account_info(accounts_iter)?;
        let swap_lamports_account = next_account_info(accounts_iter)?;
        let swap_store_account = next_account_info(accounts_iter)?;
        let token_program = next_account_info(accounts_iter)?;
        let pda_account = next_account_info(accounts_iter)?;

        if !signer_account.is_signer {
            return Err(ProgramError::IncorrectProgramId);
        }
        if swap_lamports_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }
        if swap_store_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }
        if *receiver_token_account.owner != spl_token::id() {
            return Err(ProgramError::IncorrectProgramId);
        }
        
        let mut swap_store = SwapStore::try_from_slice(*swap_store_account.data.borrow())
            .expect("Error deserialaizing data");

        if swap_store.token_funded_account != *token_funded_account.key {
            return Err(ProgramError::InvalidAccountData);
        }

        let amount = **swap_lamports_account.lamports.borrow();
        swap_store.amount_swapped += amount;
        **swap_store_account.try_borrow_mut_lamports()? += amount;
        **swap_lamports_account.try_borrow_mut_lamports()? = 0;

        let (pda, nonce) = Pubkey::find_program_address(&[b"mov_swap"], program_id);
        let transfer_ix = spl_token::instruction::transfer(
            token_program.key,
            token_funded_account.key,
            receiver_token_account.key,
            &pda,
            &[&pda],
            amount * SWAP_RATIO,
        )?;
        msg!("Calling the token program to transfer tokens to the escrow's initializer...");
        invoke_signed(
            &transfer_ix,
            &[
                token_funded_account.clone(),
                receiver_token_account.clone(),
                pda_account.clone(),
                token_program.clone(),
            ],
            &[&[&b"mov_swap"[..], &[nonce]]],
        )?;

        swap_store.serialize(&mut &mut swap_store_account.data.borrow_mut()[..])?;

        Ok(())
    }

    fn process_withdraw(
        accounts: &[AccountInfo],
        amount: u64,
        program_id: &Pubkey,
    ) -> ProgramResult {
        let accounts_iter = &mut accounts.iter();
        let admin_account = next_account_info(accounts_iter)?;
        let swap_store_account = next_account_info(accounts_iter)?;
        if !admin_account.is_signer {
            return Err(ProgramError::IncorrectProgramId);
        }
        if swap_store_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }

        let swap_store = SwapStore::try_from_slice(*swap_store_account.data.borrow())
            .expect("Error deserialaizing data");

        if swap_store.admin != *admin_account.key {
            return Err(ProgramError::InvalidAccountData);
        }

        let rent_exemption = Rent::get()?.minimum_balance(swap_store_account.data_len());
        if **swap_store_account.lamports.borrow() - rent_exemption < amount {
            return Err(ProgramError::InsufficientFunds);
        }

        **swap_store_account.try_borrow_mut_lamports()? -= amount;
        **admin_account.try_borrow_mut_lamports()? += amount;

        Ok(())
    }
}
