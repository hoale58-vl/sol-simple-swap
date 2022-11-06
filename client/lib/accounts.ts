import { Account, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAccount, getAssociatedTokenAddress, TokenAccountNotFoundError, TokenInvalidAccountOwnerError, TokenInvalidMintError, TokenInvalidOwnerError, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { AccountInfo, Connection, PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { SWAP_PROGRAM_ID } from "./const";

export const swapProgramId = new PublicKey(
    SWAP_PROGRAM_ID
);

export const SWAP_STORE_SEED = "swapStoreAccount";
export const getSwapStoreAccount = (ownerPubKey: PublicKey) : Promise<PublicKey> => {
    return PublicKey.createWithSeed(
        ownerPubKey,
        SWAP_STORE_SEED,
        swapProgramId
    );
}

export const getTokenAccount = async (connection: Connection, ownerPubKey: PublicKey, mintTokenAccount: PublicKey) : Promise<{pubkey: PublicKey, instruction: TransactionInstruction | undefined}> => {
    // This is the optimal logic, considering TX fee, client-side computation, RPC roundtrips and guaranteed idempotent.
    // Sadly we can't do this atomically.
    const associatedToken = await getAssociatedTokenAddress(mintTokenAccount, ownerPubKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    let account: Account;
    let instruction: TransactionInstruction | undefined;
    try {
        account = await getAccount(connection, associatedToken, undefined, TOKEN_PROGRAM_ID);
    } catch (error: unknown) {
        // TokenAccountNotFoundError can be possible if the associated address has already received some lamports,
        // becoming a system account. Assuming program derived addressing is safe, this is the only case for the
        // TokenInvalidAccountOwnerError in this code path.
        if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
            // As this isn't atomic, it's possible others can create associated accounts meanwhile.
            try {
                instruction = createAssociatedTokenAccountInstruction(
                    ownerPubKey, // payer
                    associatedToken, // associated Token 
                    ownerPubKey, // owner
                    mintTokenAccount, // mint account
                    TOKEN_PROGRAM_ID, // SPL token programId 
                    ASSOCIATED_TOKEN_PROGRAM_ID, // SPL assiciated token programId 
                );
            } catch (error: unknown) {
                // Ignore all errors; for now there is no API-compatible way to selectively ignore the expected
                // instruction error if the associated account exists already.
            }
        } else {
            throw error;
        }
    }
    
    return {
        pubkey: associatedToken,
        instruction
    };
}

export const SWAP_LAMPORT_ACCOUNT = "swapLamportsAccount";
export const getSwapLamportAccount = async (connection: Connection, ownerPubKey: PublicKey, lamports: number) : Promise<{pubkey: PublicKey, instruction: TransactionInstruction | undefined}> => {
    const SEED = `${SWAP_LAMPORT_ACCOUNT}`;
    const pubkey = await PublicKey.createWithSeed(
        ownerPubKey,
        SEED,
        swapProgramId
    );
    let account: Account;
    let instruction: TransactionInstruction | undefined;
    let info: AccountInfo<Buffer> | null = null;
    try {
        info = await connection.getAccountInfo(pubkey, undefined);
    } catch (error: unknown) {
        console.log(error);
    }
    if (info == null || !info.owner) {
        instruction = SystemProgram.createAccountWithSeed({
            fromPubkey: ownerPubKey,
            basePubkey: ownerPubKey,
            seed: SEED,
            newAccountPubkey: pubkey,
            lamports,
            space: 1,
            programId: swapProgramId,
        });
    }
    return {
        pubkey,
        instruction
    };
}