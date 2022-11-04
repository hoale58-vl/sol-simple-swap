// Copyright 2022 HoaLe. All rights reserved.

use thiserror::Error;
use solana_program::program_error::ProgramError;

#[derive(Error, Debug, Copy, Clone)]
pub enum SwapError {
    #[error("Invalid Instruction")]
    InvalidInstruction,
}

impl From<SwapError> for ProgramError {
    fn from(e: SwapError) -> Self {
        ProgramError::Custom(e as u32)
    }
}