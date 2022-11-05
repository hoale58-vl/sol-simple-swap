import * as React from "react"
import { Link, HeadFC } from "gatsby"
import { CLUSTER, SWAP_PROGRAM_ID } from "lib/const"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"

const pageStyles = {
  color: "#232129",
  padding: 96,
  fontFamily: "-apple-system, Roboto, sans-serif, serif",
}

const headingStyles = {
  marginTop: 0,
  marginBottom: 64,
  maxWidth: 320,
}

const IndexPage = () => {
  return (
    <main style={pageStyles}>
      <h1 style={headingStyles}>Home page</h1>
      <ul>
        <li>
          <p>
            <b>Cluster: </b> {CLUSTER}
          </p>
        </li>
        <li>
          <p>
            <b>Program ID: </b> {SWAP_PROGRAM_ID}
          </p>
        </li>
        <li>
          <p>
            <b>Token Program ID: </b> {TOKEN_PROGRAM_ID.toString()}
          </p>
        </li>
      </ul>
      <p>
        <br />
        <Link to="/admin">Go to Admin page</Link>
      </p>
      <p>
        <br />
        <Link to="/swap">Go to Swap page</Link>
      </p>
    </main>
  )
}

export default IndexPage

export const Head: HeadFC = () => <title>Home Page</title>
