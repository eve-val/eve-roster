import merge from "webpack-merge";
import { commonConfig } from "./webpack.common";
import { getProjectPaths } from "./paths";
import webpack from "webpack";

const paths = getProjectPaths();
const config: webpack.Configuration = merge(
  commonConfig("development", paths),

  {
    // Add another entry point to make sure we include the hot module
    // replacement client (this will be in addition to main.ts, which is
    // defined in common)
    entry: ["webpack-hot-middleware/client?noInfo=true"],

    // Which approach to use while serving source maps
    // There are a dizzying array of options that trade accuracy for speed, etc.
    // See https://webpack.js.org/configuration/devtool/
    devtool: "eval-cheap-module-source-map",
    plugins: [
      // Allows for code replacement without page refresh
      new webpack.HotModuleReplacementPlugin(),
    ],
  }
);

export default config;
