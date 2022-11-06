import {
    Connection,
    SystemProgram,
    Transaction,
    PublicKey,
    TransactionInstruction,
    ParsedAccountData
} from "@solana/web3.js";
import Wallet from "@project-serum/sol-wallet-adapter";
import { serialize } from "borsh";
import { getTokenAccount, getSwapStoreAccount, swapProgramId, SWAP_STORE_SEED, getSwapLamportAccount } from "lib/accounts";
import { WithdrawRequest } from "lib/types";
import { CLUSTER } from "./const";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const cluster = CLUSTER;
const connection = new Connection(cluster, "confirmed");
const wallet = new Wallet("https://www.sollet.io", cluster);

export async function setPayerAndBlockhashTransaction(instructions: TransactionInstruction[]) {
    const transaction = new Transaction();
    instructions.forEach(element => {
        transaction.add(element);
    });
    
    if (wallet.publicKey === null) {
        throw new Error("No connected account");
    }
    transaction.feePayer = wallet.publicKey;
    let hash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = hash.blockhash;
    return transaction;
}

export async function signAndSendTransaction(transaction: Transaction) {
    try {
        console.log("start signAndSendTransaction");
        let signedTrans = await wallet.signTransaction(transaction);
        console.log("signed transaction");
        let signature = await connection.sendRawTransaction(
            signedTrans.serialize()
        );
        console.log("end signAndSendTransaction");
        return signature;
    } catch (err) {
        console.log("signAndSendTransaction error", err);
        throw err;
    }
}

export async function checkWallet() {
    if (!wallet.connected) {
        await wallet.connect();
    }
}

export const getAddress = async () : Promise<string | null> =>  {
    await checkWallet();
    if (wallet.publicKey === null) {
        return null;
    }
    return wallet.publicKey.toBase58();
}

export const getAssociatedTokenAccount = async (token: string, owner: string) : Promise<string> =>  {
    return (await getAssociatedTokenAddress(
        new PublicKey(token), // mint
        new PublicKey(owner), // mint
    )).toString();
}

export const getMintTokenAccounts = async () : Promise<string[]> =>  {
    await checkWallet();
    
    if (wallet.publicKey === null) {
        throw new Error("No connected account");
    }
    const accounts = await connection.getParsedProgramAccounts(
        TOKEN_PROGRAM_ID,
        {
            filters: [
              {
                dataSize: 165, // number of bytes
              },
              {
                memcmp: {
                  offset: 32, // number of bytes
                  bytes: wallet.publicKey.toString(), // base58 encoded string
                },
              }
            ],
            commitment: "recent"
        }
    );
    return accounts.map((account) => (account.account.data as  ParsedAccountData).parsed.info.mint);
}

export const initialize = async (associatedTokenAccount: string) => {
    try {
        await checkWallet();
        
        if (wallet.publicKey === null) {
            throw new Error("No connected account");
        }
        let instructions: TransactionInstruction[] = [];
        
        // createSwapStoreAccount
        const swapStoreAccount = await getSwapStoreAccount(wallet.publicKey);
        const info = await connection.getAccountInfo(swapStoreAccount);

        if (!info) {
            // rent-exemption swap store
            // admin - PublicKey - 32
            // amount_swapped - u64 - 8
            // token_funded_account - PublicKey - 32
            const lamports =
                (await connection.getMinimumBalanceForRentExemption(72));
            const createSwapStoreAccount = SystemProgram.createAccountWithSeed({
                fromPubkey: wallet.publicKey,
                basePubkey: wallet.publicKey,
                seed: SWAP_STORE_SEED,
                newAccountPubkey: swapStoreAccount,
                lamports: lamports,
                space: 72,
                programId: swapProgramId,
            });
            instructions.push(createSwapStoreAccount);
        }

        // initialize swap
        const fundedAccount = new PublicKey(associatedTokenAccount);
        const initializeInstruction = new TransactionInstruction({
            keys: [
                { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
                { pubkey: swapStoreAccount, isSigner: false, isWritable: true },
                { pubkey: fundedAccount, isSigner: false, isWritable: true },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ],
            programId: swapProgramId,
            data: Buffer.from(new Uint8Array([0]))
        });
        
        instructions.push(initializeInstruction);
        const trans = await setPayerAndBlockhashTransaction(
            instructions
        );
        const signature = await signAndSendTransaction(trans);
        const result = await connection.confirmTransaction(signature);
        if (!result.value.err) {
            alert(`Initialize success!`);
        }
    } catch (error) {
        alert(error);
    }
}

/// Mint account: SPL Token account pubkey
/// Amount: Amount of SPL Token
export const swap = async (initializer: PublicKey, mintAccount: PublicKey, amount: number) => {
    try {
        await checkWallet();
        
        if (wallet.publicKey === null) {
            throw new Error("No connected account");
        }
        let instructions: TransactionInstruction[] = [];

        const swapStoreAccount = await getSwapStoreAccount(initializer);
        try {
            const info = await connection.getAccountInfo(swapStoreAccount);
        } catch (e) {
            throw new Error("Invalid swap store account");
        }
        const { pubkey: fundedAccount, instruction: createFundAccountInstruction } = await getTokenAccount(connection, initializer, mintAccount);
        if (createFundAccountInstruction) {
            throw new Error("Not initialized");
        }
        const { pubkey: swapLamportsAccount, instruction: createSwapLamportAccount } = await getSwapLamportAccount(connection, wallet.publicKey, amount);
        if (createSwapLamportAccount) {
            instructions.push(createSwapLamportAccount);
        }

        const { pubkey: tokenReceiverAccount, instruction: createTokenReceiverAccountInstruction } = await getTokenAccount(connection, wallet.publicKey, mintAccount);
        if (createTokenReceiverAccountInstruction) {
            instructions.push(createTokenReceiverAccountInstruction);
        }

        const [pdaAccount, _nonce] = await PublicKey.findProgramAddress([Buffer.from("mov_swap")], swapProgramId);
        console.log(pdaAccount.toBase58());

        const swapInstruction = new TransactionInstruction({
            keys: [
                { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
                { pubkey: fundedAccount, isSigner: false, isWritable: true },
                { pubkey: tokenReceiverAccount, isSigner: false, isWritable: true },
                { pubkey: swapLamportsAccount, isSigner: false, isWritable: true },
                { pubkey: swapStoreAccount, isSigner: false, isWritable: true },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
                { pubkey: pdaAccount, isSigner: false, isWritable: false},
            ],
            programId: swapProgramId,
            data: Buffer.from(new Uint8Array([1]))
        });
        instructions.push(swapInstruction);
        const trans = await setPayerAndBlockhashTransaction(instructions);
        const signature = await signAndSendTransaction(trans);
        const result = await connection.confirmTransaction(signature);
        if (!result.value.err) {
            alert(`Swap success!`);
        }
    } catch (error) {
        alert(error);
    }
    
}

export async function withdraw(
    swapStoreKey: PublicKey, amount: number
) {
    await checkWallet();
    let withdrawRequest = new WithdrawRequest(amount);
    let data = serialize(WithdrawRequest.schema, withdrawRequest);
    let data_to_send = new Uint8Array([2, ...data]);
    
    if (wallet.publicKey !== null) {
        const instructionTOOurProgram = new TransactionInstruction({
            keys: [
                { pubkey: swapStoreKey, isSigner: false, isWritable: true },
                { pubkey: wallet.publicKey, isSigner: true, isWritable: false }
            ],
            programId: swapProgramId,
            data: Buffer.from(data_to_send)
        });
        const trans = await setPayerAndBlockhashTransaction(
            [instructionTOOurProgram]
        );
        const signature = await signAndSendTransaction(trans);
        const result = await connection.confirmTransaction(signature);
        console.log("end sendMessage", result);
    } else {
        throw new Error("No connected account");
    }
}