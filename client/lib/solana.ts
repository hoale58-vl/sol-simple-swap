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
import { getFundedAccount, getTokenAccount, getSwapStoreAccount, swapProgramId, SWAP_STORE_SEED, tokenProgramId, getSwapLamportAccount } from "lib/accounts";
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

export const initialize = async (fundedAccount: PublicKey) => {
    await checkWallet();
    if (wallet.publicKey === null) {
        throw new Error("No connected account");
    }
    
    // createSwapStoreAccount
    const swapStoreAccount = await getSwapStoreAccount(wallet.publicKey);
    // rent-exemption swap store
    // is_initialized - bool - 1
    // admin - PublicKey - 32
    // amount_swapped - u64 - 64
    // token_funded_account - PublicKey - 32
    const lamports =
        (await connection.getMinimumBalanceForRentExemption(129));
    const createProgramAccount = SystemProgram.createAccountWithSeed({
        fromPubkey: wallet.publicKey,
        basePubkey: wallet.publicKey,
        seed: SWAP_STORE_SEED,
        newAccountPubkey: swapStoreAccount,
        lamports: lamports,
        space: 129 * 2,
        programId: swapProgramId,
    });

    // initialize swap
    const initializeInstruction = new TransactionInstruction({
        keys: [
            { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
            { pubkey: swapStoreAccount, isSigner: false, isWritable: true },
            { pubkey: fundedAccount, isSigner: false, isWritable: false },
            { pubkey: tokenProgramId, isSigner: false, isWritable: false },
        ],
        programId: swapProgramId,
    });

    const trans = await setPayerAndBlockhashTransaction(
        [
            createProgramAccount, 
            initializeInstruction
        ]
    );
    const signature = await signAndSendTransaction(trans);
    const result = await connection.confirmTransaction(signature);
    console.log("end sendMessage", result);
}

/// Mint account: SPL Token account pubkey
/// Amount: Amount of SPL Token
export const swap = async (mintAccount: PublicKey, amount: number) => {
    await checkWallet();
    if (wallet.publicKey === null) {
        throw new Error("No connected account");
    }
    const nonce = (await connection.getNonce(wallet.publicKey))?.nonce ?? "0";

    const swapStoreAccount = await getSwapStoreAccount(wallet.publicKey);
    const fundedAccount = await getFundedAccount(wallet.publicKey);
    const { pubkey: swapLamportsAccount, instruction: createSwapLamportAccount } = await getSwapLamportAccount(wallet.publicKey, amount, nonce);
    const { pubkey: tokenReceiverAccount, instruction: createTokenReceiverAccountInstruction } = await getTokenAccount(wallet.publicKey, mintAccount, nonce);

    const swapInstruction = new TransactionInstruction({
        keys: [
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: fundedAccount, isSigner: false, isWritable: true },
            { pubkey: tokenReceiverAccount, isSigner: false, isWritable: true },
            { pubkey: swapLamportsAccount, isSigner: false, isWritable: true },
            { pubkey: swapStoreAccount, isSigner: false, isWritable: true },
            { pubkey: tokenProgramId, isSigner: false, isWritable: false},
            { pubkey: swapProgramId, isSigner: false, isWritable: false},
        ],
        programId: swapProgramId,
    });

    const trans = await setPayerAndBlockhashTransaction(
        [createSwapLamportAccount, createTokenReceiverAccountInstruction, swapInstruction]
    );
    const signature = await signAndSendTransaction(trans);
    const result = await connection.confirmTransaction(signature);
    console.log("end sendMessage", result);
}

export async function withdraw(
    swapStoreKey: PublicKey, amount: number
) {
    await checkWallet();
    let withdrawRequest = new WithdrawRequest(amount);
    let data = serialize(WithdrawRequest.schema, withdrawRequest);
    let data_to_send = new Uint8Array([1, ...data]);

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