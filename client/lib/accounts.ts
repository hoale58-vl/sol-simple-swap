import { createInitializeAccountInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { SWAP_PROGRAM_ID } from "./const";

export const swapProgramId = new PublicKey(
    SWAP_PROGRAM_ID
);

export const tokenProgramId = new PublicKey(
    TOKEN_PROGRAM_ID
);

export const SWAP_STORE_SEED = "swapStoreAccount";
export const getSwapStoreAccount = (ownerPubKey: PublicKey) : Promise<PublicKey> => {
    return PublicKey.createWithSeed(
        ownerPubKey,
        SWAP_STORE_SEED,
        swapProgramId
    );
}

export const FUNDED_ACCOUNT_SEED = "movSwapFundedAccount";
export const getFundedAccount = (ownerPubKey: PublicKey) : Promise<PublicKey> => {
    return PublicKey.createWithSeed(
        ownerPubKey,
        FUNDED_ACCOUNT_SEED,
        tokenProgramId
    );
}

export const RECEIVER_TOKEN_ACCOUNT_SEED = "receiverTokenAccountSeed";
export const getTokenAccount = async (ownerPubKey: PublicKey, mintTokenAccount: PublicKey, nonce: string) : Promise<{pubkey: PublicKey, instruction: TransactionInstruction}> => {
    const SEED = `${RECEIVER_TOKEN_ACCOUNT_SEED} ${ownerPubKey.toString()} ${nonce}`;
    const pubkey = await PublicKey.createWithSeed(
        ownerPubKey,
        SEED,
        tokenProgramId
    );
    const instruction = createInitializeAccountInstruction(
        pubkey, // token account
        mintTokenAccount, // mint account
        ownerPubKey, // owner
        tokenProgramId, // SPL token programId 
    );
    return {
        pubkey,
        instruction
    };
}

export const SWAP_LAMPORT_ACCOUNT = "swapLamportsAccount";
export const getSwapLamportAccount = async (ownerPubKey: PublicKey, lamports: number, nonce: string) : Promise<{pubkey: PublicKey, instruction: TransactionInstruction}> => {
    const SEED = `${SWAP_LAMPORT_ACCOUNT} ${ownerPubKey.toString()} ${nonce}`;
    const pubkey = await PublicKey.createWithSeed(
        ownerPubKey,
        SEED,
        tokenProgramId
    );
    const instruction = SystemProgram.createAccountWithSeed({
        fromPubkey: ownerPubKey,
        basePubkey: ownerPubKey,
        seed: SEED,
        newAccountPubkey: pubkey,
        lamports,
        space: 1,
        programId: swapProgramId,
    });
    return {
        pubkey,
        instruction
    };
}