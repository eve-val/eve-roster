import path from "path";

import webpack from "webpack";
import { ProjectPaths } from "./paths";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import MomentLocalesPlugin = require("moment-locales-webpack-plugin");
import { VueLoaderPlugin } from "vue-loader";
import TerserPlugin = require("terser-webpack-plugin");
import HtmlWebpackPlugin from "html-webpack-plugin";
import HtmlWebpackPugPlugin from "html-webpack-pug-plugin";
import MiniCssExtractPlugin = require("mini-css-extract-plugin");
import CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
import CleanupMiniCssExtractPlugin = require("cleanup-mini-css-extract-plugin");
import ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");
import { extendDefaultPlugins } from "svgo";

export function commonConfig(
  mode: "development" | "production",
  paths: ProjectPaths
): webpack.Configuration {
  return {
    // webpack gives us a lot of nice built-in behavior depending on whether
    // this is "development" or "production"
    mode: mode,

    // Main entry point of the app; the transitive dependencies of this file
    // determine what we include in the compiled bundle.
    entry: {
      main: path.join(paths.clientSrc, "home.js"),
      login: path.join(paths.clientSrc, "login.js"),
    },

    output: {
      // Directory to write compiled JS and any static assets to
      path: paths.output,

      // The name of the final compiled bundle
      filename: "[name].[contenthash].js",

      // Public URL where compiled assets will be hosted (so they can refer to
      // one another).
      publicPath: paths.public,
    },

    module: {
      rules: [
        // Compilation for Vue single file components (*.vue)
        {
          test: /\.vue$/,
          loader: "vue-loader",
        },

        // SASS and CSS files from Vue Single File Components:
        {
          test: /\.vue\.(s?[ac]ss)$/,
          use: [
            "vue-style-loader",
            // Converts url() and import@ references to dependencies and changes
            // them to refer to the final output filenames
            "css-loader",
          ],
        },
        // SASS and CSS files (standalone):
        {
          test: /(?<!\.vue)\.(s?[ac]ss)$/,
          use: [
            MiniCssExtractPlugin.loader,
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
      new CleanupMiniCssExtractPlugin(),

      // Required for loading .vue files
      new VueLoaderPlugin(),

      // We use the `moment` library for timekeeping, which by default includes
      // a ton of localization information we don't need (and which would bloat
      // the compiled binary). This plugin strips out all non-:'en'
      // localizations.
      new MomentLocalesPlugin(),

      // If the following constants appear in code, they will be rewritten to
      // the specified literals.
      new webpack.DefinePlugin({
        DEVELOPMENT: JSON.stringify(mode == "development"),
        "process.env.NODE_ENV": JSON.stringify(mode),
      }),

      new HtmlWebpackPlugin({
        template: path.join(paths.clientSrc, "views/home.pug"),
        favicon: path.join(paths.clientSrc, "res/favicon.ico"),
        filename: "home.pug",
        minify: true,
        chunks: ["main"],
      }),
      new HtmlWebpackPlugin({
        template: path.join(paths.clientSrc, "views/login.pug"),
        favicon: path.join(paths.clientSrc, "res/favicon.ico"),
        filename: "login.pug",
        minify: true,
        chunks: ["login"],
      }),
      new HtmlWebpackPugPlugin(),

      new ImageMinimizerPlugin({
        minimizerOptions: {
          plugins: [
            ["gifsicle", { interlaced: true }],
            ["mozjpeg", { quality: 80 }],
            [
              "pngquant",
              {
                quality: [0.6, 0.8],
              },
            ],
            [
              "svgo",
              {
                plugins: extendDefaultPlugins([
                  {
                    name: "removeViewBox",
                    active: false,
                  },
                ]),
              },
            ],
          ],
        },
      }),
    ],

    stats: {
      modules: false,
    },
    performance: {
      hints: false,
    },
    optimization: {
      minimizer: [
        new MiniCssExtractPlugin(),
        new CssMinimizerPlugin(),
        new TerserPlugin({
          parallel: true,
          sourceMap: true, // Must be set to true if using source-maps in production
          terserOptions: {
            // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
          },
        }),
      ],
      moduleIds: "hashed",
      runtimeChunk: "single",
      splitChunks: {
        minSize: 10000,
        maxSize: 250000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendor",
            chunks: "all",
          },
        },
      },
    },

    resolve: {
      // Files with these extensions can be imported without specifying the
      // extension (e.g. "./foo" vs. "./foo.ts");
      extensions: [".tsx", ".ts", ".js", ".json"],
      alias: {
        vue$: "vue/dist/vue.esm.js",
      },
    },
  };
}
