import webpack from "webpack";
import merge from "webpack-merge";
import { getProjectPaths } from "./paths";
import { commonConfig } from "./webpack.common";

const paths = getProjectPaths();

const config: webpack.Configuration = merge(
  commonConfig("production", paths),

  {
    // Webpack 4 minifies code automatically when mode='production', so no
    // extra effort required there

    // Emit a source map, even for production. Recommended by webpack, but means
    // we have to serve the source map as well
    devtool: "source-map",
  }
);

export default config;
