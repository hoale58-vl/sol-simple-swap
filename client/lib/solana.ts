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

export class SolanaClient {
    private connection: Connection;
    private wallet: Wallet;

    constructor() {
        this.connection = new Connection(CLUSTER, "confirmed");
        this.wallet = new Wallet("https://www.sollet.io", CLUSTER);
    }

    async setPayerAndBlockhashTransaction(instructions: TransactionInstruction[]) {
        const transaction = new Transaction();
        instructions.forEach(element => {
            transaction.add(element);
        });
        
        if (this.wallet.publicKey === null) {
            throw new Error("No connected account");
        }
        transaction.feePayer = this.wallet.publicKey;
        let hash = await this.connection.getLatestBlockhash();
        transaction.recentBlockhash = hash.blockhash;
        return transaction;
    }

    async signAndSendTransaction(transaction: Transaction) {
        try {
            console.log("start signAndSendTransaction");
            let signedTrans = await this.wallet.signTransaction(transaction);
            console.log("signed transaction");
            let signature = await this.connection.sendRawTransaction(
                signedTrans.serialize()
            );
            console.log("end signAndSendTransaction");
            return signature;
        } catch (err) {
            console.log("signAndSendTransaction error", err);
            throw err;
        }
    }

    async checkWallet() {
        if (!this.wallet.connected) {
            await this.wallet.connect();
        }
    }

    async getAddress() : Promise<string | null>{
        await this.checkWallet();
        if (this.wallet.publicKey === null) {
            return null;
        }
        return this.wallet.publicKey.toBase58();
    }

    async getAssociatedTokenAccount(token: string, owner: string) : Promise<string>  {
        return (await getAssociatedTokenAddress(
            new PublicKey(token), // mint
            new PublicKey(owner), // mint
        )).toString();
    }

    async getMintTokenAccounts() : Promise<string[]> {
        await this.checkWallet();
        
        if (this.wallet.publicKey === null) {
            throw new Error("No connected account");
        }
        const accounts = await this.connection.getParsedProgramAccounts(
            TOKEN_PROGRAM_ID,
            {
                filters: [
                {
                    dataSize: 165, // number of bytes
                },
                {
                    memcmp: {
                    offset: 32, // number of bytes
                    bytes: this.wallet.publicKey.toString(), // base58 encoded string
                    },
                }
                ],
                commitment: "recent"
            }
        );
        return accounts.map((account) => (account.account.data as  ParsedAccountData).parsed.info.mint);
    }

    async initialize(associatedTokenAccount: string) {
        try {
            await this.checkWallet();
            
            if (this.wallet.publicKey === null) {
                throw new Error("No connected account");
            }
            let instructions: TransactionInstruction[] = [];
            
            // createSwapStoreAccount
            const swapStoreAccount = await getSwapStoreAccount(this.wallet.publicKey);
            const info = await this.connection.getAccountInfo(swapStoreAccount);

            if (!info) {
                // rent-exemption swap store
                // admin - PublicKey - 32
                // amount_swapped - u64 - 8
                // token_funded_account - PublicKey - 32
                const lamports =
                    (await this.connection.getMinimumBalanceForRentExemption(72));
                const createSwapStoreAccount = SystemProgram.createAccountWithSeed({
                    fromPubkey: this.wallet.publicKey,
                    basePubkey: this.wallet.publicKey,
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
                    { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
                    { pubkey: swapStoreAccount, isSigner: false, isWritable: true },
                    { pubkey: fundedAccount, isSigner: false, isWritable: true },
                    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                ],
                programId: swapProgramId,
                data: Buffer.from(new Uint8Array([0]))
            });
            
            instructions.push(initializeInstruction);
            const trans = await this.setPayerAndBlockhashTransaction(
                instructions
            );
            const signature = await this.signAndSendTransaction(trans);
            const result = await this.connection.confirmTransaction(signature);
            if (!result.value.err) {
                alert(`Initialize success!`);
            }
        } catch (error) {
            alert(error);
        }
    }

    /// Mint account: SPL Token account pubkey
    /// Amount: Amount of SPL Token
    async swap(initializer: PublicKey, mintAccount: PublicKey, amount: number) {
        try {
            await this.checkWallet();
            
            if (this.wallet.publicKey === null) {
                throw new Error("No connected account");
            }
            let instructions: TransactionInstruction[] = [];

            const swapStoreAccount = await getSwapStoreAccount(initializer);
            try {
                const info = await this.connection.getAccountInfo(swapStoreAccount);
            } catch (e) {
                throw new Error("Invalid swap store account");
            }
            const { pubkey: fundedAccount, instruction: createFundAccountInstruction } = await getTokenAccount(this.connection, initializer, mintAccount);
            if (createFundAccountInstruction) {
                throw new Error("Not initialized");
            }
            const { pubkey: swapLamportsAccount, instruction: createSwapLamportAccount } = await getSwapLamportAccount(this.connection, this.wallet.publicKey, amount);
            if (createSwapLamportAccount) {
                instructions.push(createSwapLamportAccount);
            }

            const { pubkey: tokenReceiverAccount, instruction: createTokenReceiverAccountInstruction } = await getTokenAccount(this.connection, this.wallet.publicKey, mintAccount);
            if (createTokenReceiverAccountInstruction) {
                instructions.push(createTokenReceiverAccountInstruction);
            }

            const [pdaAccount, _nonce] = await PublicKey.findProgramAddress([Buffer.from("mov_swap")], swapProgramId);
            console.log(pdaAccount.toBase58());

            const swapInstruction = new TransactionInstruction({
                keys: [
                    { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
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
            const trans = await this.setPayerAndBlockhashTransaction(instructions);
            const signature = await this.signAndSendTransaction(trans);
            const result = await this.connection.confirmTransaction(signature);
            if (!result.value.err) {
                alert(`Swap success!`);
            }
        } catch (error) {
            alert(error);
        }
        
    }

    async withdraw(
        swapStoreKey: PublicKey, amount: number
    ) {
        await this.checkWallet();
        let withdrawRequest = new WithdrawRequest(amount);
        let data = serialize(WithdrawRequest.schema, withdrawRequest);
        let data_to_send = new Uint8Array([2, ...data]);
        
        if (this.wallet.publicKey !== null) {
            const instructionTOOurProgram = new TransactionInstruction({
                keys: [
                    { pubkey: swapStoreKey, isSigner: false, isWritable: true },
                    { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false }
                ],
                programId: swapProgramId,
                data: Buffer.from(data_to_send)
            });
            const trans = await this.setPayerAndBlockhashTransaction(
                [instructionTOOurProgram]
            );
            const signature = await this.signAndSendTransaction(trans);
            const result = await this.connection.confirmTransaction(signature);
            console.log("end sendMessage", result);
        } else {
            throw new Error("No connected account");
        }
    }
}