const path = require('path');
const webpack = require('webpack');

const IS_PROD = process.env.NODE_ENV === 'production';

let config = module.exports = {
  entry: ['./src/client/home.js'],
  output: {
    path: path.resolve(__dirname, './static/dist'),
    publicPath: '/dist/',
    filename: 'build.js'
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
      'vue$': 'vue/dist/vue.esm.js'
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
      },
    }),
  ],
  devtool: '#eval-source-map'
}

if (IS_PROD) {
  // Production
  // http://vue-loader.vuejs.org/en/workflow/production.html

  config.devtool = '#source-map';

  config.plugins = [
    ...config.plugins,
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true
    }),
  ];
} else {
  // Development

  config.entry = [
    'webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000',
    ...config.entry,
  ];

  config.plugins = [
    ...config.plugins,
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
  ];
}
