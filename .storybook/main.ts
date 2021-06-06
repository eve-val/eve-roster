import Webpack from "../src/infra/build-client/webpack.dev";

module.exports = {
  stories: ["../src/**/*.stories.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  core: {
    builder: "webpack5",
  },
  webpackFinal: (config) => {
    return {
      ...config,
      module: { ...config.module, rules: Webpack.module.rules },
      plugins: Webpack.module.plugins,
    };
  },
};
