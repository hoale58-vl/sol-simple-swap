import React, { useEffect, useState } from "react"
import { Link, HeadFC } from "gatsby"
import { SolanaClient } from "lib/solana"

const pageStyles = {
    color: "#232129",
    padding: "96px",
    fontFamily: "-apple-system, Roboto, sans-serif, serif",
}

const buttonStyles = {
  fontSize: 20,
  margin: 20,
  padding: 20
}


const headingStyles = {
    marginTop: 0,
    marginBottom: 64,
    maxWidth: 320,
}

const solanaClient = new SolanaClient();

const AdminPage = () => {
    const [address, setAddress] = useState<string>("");
    const [tokenAccounts, setTokenAccounts] = useState<string[]>([]);
    const [selectedToken, setSelectedToken] = useState<string>("");
    const [associatedTokenAccount, setAssociatedTokenAccount] = useState<string>("");

    useEffect(() => {
      solanaClient.getAddress().then(
        (_address) => {
            if (_address !== null) {
            setAddress(_address);
          }
        }
      );
    }, []);

    useEffect(() => {
      if (address ){
        solanaClient.getMintTokenAccounts().then((accounts) => {
          setTokenAccounts(accounts);
        });
      }
    }, [address]);

    useEffect(() => {
      try {
        if (selectedToken) {
          solanaClient.getAssociatedTokenAccount(selectedToken, address).then((_address) => {
            setAssociatedTokenAccount(_address);
          });
        }
      } catch (e) {
        alert(e);
      }
    }, [selectedToken]);

    return (
      <main style={pageStyles}>
        <h1 style={headingStyles}>Admin page</h1>
        { address ? 
          <>
            <p><b>Your address: </b> { address} </p>
            
            <p><b>Select your token: </b></p>
            <select onChange={(event) => {
              setSelectedToken(event.target.value);
            }}>
              <option value=""></option>
              {tokenAccounts.map((accountPubkey) => <option value={accountPubkey}>{accountPubkey}</option>)}
            </select>

            {selectedToken && <>
              <p><b>Select associated token account: </b> {associatedTokenAccount ?? "..."}</p>
            </>}

            {associatedTokenAccount && <button style={buttonStyles} onClick={() => {
              solanaClient.initialize(associatedTokenAccount);
            }}>
              Initialize
            </button>}
          </>
        : <>
          <button style={buttonStyles} onClick={() => {
            solanaClient.checkWallet();
          }}>Connect wallet</button>
        </>
        }
        <div>
          <Link to="/">Go home</Link>
        </div>
      </main>
    )
  }
  
  export default AdminPage;
  export const Head: HeadFC = () => <title>Admin Page</title>