import * as React from "react"
import { Link, HeadFC } from "gatsby"

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

const SwapPage = () => {
    return (
      <main style={pageStyles}>
        <h1 style={headingStyles}>Swap page</h1>
        <p>
          <br />
          <Link to="/">Go home</Link>.
        </p>
      </main>
    )
  }
  
  export default SwapPage;
  export const Head: HeadFC = () => <title>Swap Page</title>