const path = require('path');
const webpack = require('webpack');
const pathToRegexp = require('path-to-regexp');

const routes = require('../shared/src/routes');


const ROUTE_PATTERNS = [].concat(
  routes.frontEnd.map((path) => pathToRegexp(path)),
  routes.backEnd.map((path) => pathToRegexp(path))
);

module.exports = {
  entry: {
    home: './src/home.js',
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    publicPath: '/dist/',
    filename: '[name].build.js'
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          // vue-loader options go here
        }
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]?[hash]'
        }
      },
      {
        test: /\.json$/,
        loader: 'json-loader',
      }
    ]
  },
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue'
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
      },
      __DEV__: process.env.NODE_ENV != 'production',
    }),
  ],
  devServer: {
    port: 8081,
    noInfo: true,
    proxy: [
      {
        context: function(pathname, req) {
          for (let i = 0; i < ROUTE_PATTERNS.length; i++) {
            if (ROUTE_PATTERNS[i].test(pathname)) {
              return true;
            }
          }
          return false;
        },
        target: 'http://localhost:8082',
      },
    ],
  },
  devtool: '#eval-source-map'
}

if (process.env.NODE_ENV === 'production') {
  module.exports.devtool = '#source-map'
  // http://vue-loader.vuejs.org/en/workflow/production.html
  module.exports.plugins = (module.exports.plugins || []).concat([
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true
    })
  ])
}
