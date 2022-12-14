import type { GatsbyConfig } from "gatsby";
import dotenv from 'dotenv';

dotenv.config({ path: __dirname+'client/.env' });

const config: GatsbyConfig = {
  siteMetadata: {
    title: `mov-swap`,
    siteUrl: `https://sol-swap.hoalv.tk`
  },
  // More easily incorporate content into your pages through automatic TypeScript type generation and better GraphQL IntelliSense.
  // If you use VSCode you can also use the GraphQL plugin
  // Learn more at: https://gatsby.dev/graphql-typegen
  graphqlTypegen: true,
  plugins: [
    "gatsby-plugin-sass", 
    {
      resolve: "gatsby-plugin-root-import",
      options: {
        resolveModules: [`${__dirname}/client`],
      },
    },
    {
      resolve: `gatsby-plugin-page-creator`,
      options: {
        path: `${__dirname}/client/pages`,
      },
    },
    {
      resolve: `gatsby-plugin-output`,
      options: {
        // default values
        publicPath: 'public',
        rmPublicFolder: false
      }
    }
  ]
};

export default config;
