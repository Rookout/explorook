const path = require('path');
const webpack = require('webpack')
const { BugsnagSourceMapUploaderPlugin } = require('webpack-bugsnag-plugins');
const package = require('./package.json')

const config = {
  mode: 'production',
  entry: './src/index.ts',
  target: "electron-main",
  devtool: "source-map",
  node: {
    __dirname: false,
    __filename: false
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [ '.ts', '.js' ]
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist')
  }
};

if (!process.env.development) {
  config.mode = "production";
  config.plugins = [...(config.plugins || []),
    new BugsnagSourceMapUploaderPlugin({
      apiKey: '6e673fda179162f48a2c6b5d159552d2',
      publicPath: '*/app.asar/dist',
      appVersion: package.version,
      overwrite: true,
    })
  ]
}

module.exports = config;