// Copyright 2022 HoaLe. All rights reserved.

use crate::error::SwapError::InvalidInstruction;
use solana_program::program_error::ProgramError;

pub enum SwapInstruction {
    /// Initialize swap data - for control and funding
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]`   [System Account]    Admin declared in the swap store account
    /// 1. `[writable]` [The swap account]  Store the access control data, funded lamports, swapped amount.
    Initialize {},

    /// User will swap SOL (lamports) for MOV token at the ratio is 1:10
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]`   [System Account]    The account of the person do this swap
    /// 1. `[writable]` [Token account]     That should be created prior to this instruction, authorized by the initializer. This account will receive MOV
    /// 2. `[writable]` [The swap account]  It will hold lamports signer using for swapping. This account will transfer SOL (lamports)
    /// 3. `[]`         [The swap account]  Should be created at the initialized. Store the access control data, funded lamports, swapped amount.
    Swap {},

    /// Admin withdraw swapped SOL (lamports)
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]`   [System Account]    Admin declared in the swap store account
    /// 1. `[writable]` [The swap account]  Should be created at the initialized. Store the access control data, funded lamports, swapped amount.
    Withdraw {
        amount: u64,
    },
}

impl SwapInstruction {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let (tag, rest) = input.split_first().ok_or(InvalidInstruction)?;

        Ok(match tag {
            0 => Self::Initialize {},
            1 => Self::Swap {},
            2 => Self::Withdraw {
                amount: Self::unpack_amount(rest)?,
            },
            _ => return Err(InvalidInstruction.into()),
        })
    }

    fn unpack_amount(input: &[u8]) -> Result<u64, ProgramError> {
        let amount = input
            .get(..8)
            .and_then(|slice| slice.try_into().ok())
            .map(u64::from_le_bytes)
            .ok_or(InvalidInstruction)?;
        Ok(amount)
    }
}
