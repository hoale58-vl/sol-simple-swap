import React, { useEffect, useState } from "react"
import { Link, HeadFC } from "gatsby"
import { SolanaClient } from "lib/solana"
import { PublicKey } from "@solana/web3.js"

const pageStyles = {
    color: "#232129",
    padding: "96px",
    fontFamily: "-apple-system, Roboto, sans-serif, serif",
}

const headingStyles = {
    marginTop: 0,
    marginBottom: 64,
    maxWidth: 320,
}

const buttonStyles = {
  fontSize: 20,
  margin: 20,
  padding: 20
}

const solanaClient = new SolanaClient();

const SwapPage = () => {
    const [address, setAddress] = useState<string>("");
    const [initializer, setInitializer] = useState<string>("Cunx9F1cKcjKaR5N6Gkw7etMrrJATDAvbw2q1cqNN31w");
    const [amount, setAmount] = React.useState<string>("1");
    const [mintedAccountPubkey, setMintedAccountPubkey] = React.useState<string>("CkNFHdq5NCs8hQqSmkHCm7qbtijgq1XQKuxZRd8WQJk2");

    useEffect(() => {
      solanaClient.getAddress().then(
        (_address) => {
            if (_address !== null) {
            setAddress(_address);
          }
        }
      );
    }, []);

    return (
      <main style={pageStyles}>
        <h1 style={headingStyles}>Swap page</h1>
        { address ? 
          <>
            <p>
              <b>Amount: </b>
              <input value={amount} onChange={(event) => {
                setAmount(event.target.value);
              }} type="number"></input>
            </p>
            <p>
              <b>Initializer: </b>
              <input value={initializer} onChange={(event) => {
                setInitializer(event.target.value);
              }}></input>
            </p>
            <p>
              <b>Token: </b>
              <input value={mintedAccountPubkey} onChange={(event) => {
                setMintedAccountPubkey(event.target.value);
              }}></input>
            </p>
            
            {amount && mintedAccountPubkey && <>
              <button style={buttonStyles} onClick={() => {
                const mintAccount = new PublicKey(mintedAccountPubkey);
                const initializerAccount = new PublicKey(initializer);
                solanaClient.swap(initializerAccount, mintAccount, parseInt(amount));
              }}>
                Swap
              </button>
            </>}
          </>
          : <>
          <button style={buttonStyles} onClick={() => {
            solanaClient.checkWallet();
          }}>Connect wallet</button>
          </>
        }
        <br />
        <Link to="/">Go home</Link>.
      </main>
    )
  }
  
  export default SwapPage;
  export const Head: HeadFC = () => <title>Swap Page</title>