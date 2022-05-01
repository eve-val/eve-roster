import { merge } from "webpack-merge";
import { commonConfig } from "./webpack.js";
import { getProjectPaths } from "./paths.js";
import webpack from "webpack";

const paths = getProjectPaths();
const config: webpack.Configuration = merge(
  commonConfig("development", paths),
  {
    // Which approach to use while serving source maps
    // There are a dizzying array of options that trade accuracy for speed, etc.
    // See https://webpack.js.org/configuration/devtool/
    devtool: "eval-cheap-module-source-map",
  }
);

export default config;
