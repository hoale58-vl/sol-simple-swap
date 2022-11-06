
import { CreateWebpackConfigArgs } from "gatsby";
import webpack from "webpack";

export const onCreateWebpackConfig = ({ stage, loaders, actions }: CreateWebpackConfigArgs) => {
  actions.setWebpackConfig({
    plugins: [
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
          }),
    ],
    module: stage === "build-html" ?  {
        rules: [
          {
            test: /@project-serum/,
            use: loaders.null(),
          },
        ],
      } : undefined
  });

};