# Required Features:
- Create a new token on Solana testnet, for example, MOVE token.
- Create a smart contract to swap SOL to MOVE token, for each SOL swapped we will receive 10 MOVE (the price is a constant).
- Create a UI to swap or create a script to execute to send swap transaction to Solana testnet

# Technical requirements:
- Use Git and commit often
- Have unit test for that contract
- Smart contract have to be deployed to Solana testnet and execute successfully


# Implementation

## 1. Config cluster and SOLANA account

```
# RPC
TESTNET_RPC=https://api.testnet.solana.com
DEVNET_RPC=https://api.devnet.solana.com
solana config set --url $TESTNET_RPC

# Account
solana-keygen new
solana config set --keypair ${HOME}/.config/solana/id.json
solana address

# Get some SOL
solana airdrop 1
solana balance
```

## 2. Create new fungible token <MOVE>

```
cargo install spl-token-cli

# Initialize Mint Account
DECIMALS=9
spl-token create-token --decimals=$DECIMALS

# Save token address here
MINT_ACCOUNT=5QtwP6KYFYrxSpP23qixvd1KjTMGaC8C9PWd7uJ2us1E

# Create token account
spl-token create-account $MINT_ACCOUNT

# Save token account
TOKEN_ACCOUNT=9ayApuo1JgnzvkkF8sPfW4YoFJz2hQpFp2EuuPPPju4R

# Mint funded amount of token
spl-token mint $MINT_ACCOUNT 100
```

## 3. Build program

```
cargo build-sbf --manifest-path=$(pwd)/Cargo.toml --sbf-out-dir=dist/
```

## 4. Deploy program

```
solana program deploy dist/mov_swap.so

# Save ProgramID
PROGRAM_ID=C6xPYMhNcqLwZgfWsSgn2oeBi5URBcdhxCQkfxvKee7B
```

## 5. Initializer (fund token to program)

```
- Go to admin page
- Select token want to fund
- Click Initialize button
- Sign and submit the transaction (using sollet)
```

## 6. Logged in as user - who want to swap SOL for MOV token

```
- Go to swap page
- Input amount of SOL
- Input the initializer and token want to swap
- Click swap
- Sign and submit the transaction (using sollet)
```