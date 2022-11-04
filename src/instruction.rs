// Copyright 2022 HoaLe. All rights reserved.

pub enum ProgramInstruction {
    Withdraw {
        amount: u64,
    },
    Swap {
        amount: u64,
    },
}
