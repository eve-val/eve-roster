import path from "path";

import webpack from "webpack";
import { ProjectPaths } from "./paths";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
const MomentLocalesPlugin = require("moment-locales-webpack-plugin");
const { VueLoaderPlugin } = require("vue-loader");

export function commonConfig(
  mode: "development" | "production",
  paths: ProjectPaths
): webpack.Configuration {
  return {
    // webpack gives us a lot of nice built-in behavior depending on whether
    // this is 'development' or 'production'
    mode: mode,

    // Main entry point of the app; the transitive dependencies of this file
    // determine what we include in the compiled bundle.
    entry: [path.join(paths.src, "client/home.js")],

    output: {
      // Directory to write compiled JS and any static assets to
      path: path.join(paths.root, "out/client"),

      // The name of the final compiled bundle
      filename: "build.js",

      // Public URL where compiled assets will be hosted (so they can refer to
      // one another).
      publicPath: "/dist/",
    },

    module: {
      rules: [
        // Compilation for Vue single file components (*.vue)
        {
          test: /\.vue$/,
          loader: "vue-loader",
        },

        // CSS processing (for both .vue files and normal .css files)
        {
          test: /\.css$/,
          use: [
            "vue-style-loader",
            // Converts url() and import@ references to dependencies and changes
            // them to refer to the final output filenames
            "css-loader",
          ],
        },

        // Images
        // TODO: Check if we want to include the hash here
        {
          test: /\.(png|jpg|gif|svg)$/,
          loader: "file-loader",
          options: {
            name: "[name].[ext]?[hash]",

            // This is necessary due to how vue-loader consumes images.
            // See https://github.com/vuejs/vue-loader/issues/1612
            esModule: false,
          },
        },

        // Loader for JSON files
        // TODO: We may not need this?
        {
          test: /\.json$/,
          loader: "json-loader",
        },
      ],
    },

    plugins: [
      // Cleans up any obsolete build artifacts (e.g. images that have since been
      // deleted).
      new CleanWebpackPlugin(),

      // Required for loading .vue files
      new VueLoaderPlugin(),

      // We use the `moment` library for timekeeping, which by default includes
      // a ton of localization information we don't need (and which would bloat
      // the compiled binary). This plugin strips out all non-'en'
      // localizations.
      new MomentLocalesPlugin(),

      // If the following constants appear in code, they will be rewritten to
      // the specified literals.
      new webpack.DefinePlugin({
        DEVELOPMENT: JSON.stringify(mode == "development"),
        "process.env.NODE_ENV": JSON.stringify(mode),
      }),
    ],

    resolve: {
      // Files with these extensions can be imported without specifying the
      // extension (e.g. './foo' vs. './foo.ts');
      extensions: [".tsx", ".ts", ".js", ".json"],
      alias: {
        vue$: "vue/dist/vue.esm.js", // 'vue/dist/vue.common.js' for webpack 1
      },
    },
  };
}
