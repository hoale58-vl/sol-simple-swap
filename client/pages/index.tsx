import * as React from "react"
import { Link, HeadFC } from "gatsby"

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
      <p>
        <br />
        <Link to="/admin">Go to Admin page</Link>
      </p>
      <p>
        <br />
        <Link to="/admin">Go to Swap page</Link>
      </p>
    </main>
  )
}

export default IndexPage

export const Head: HeadFC = () => <title>Home Page</title>
