const path = require('path');

const config = {
  mode: 'production',
  entry: './src/index.ts',
  target: "electron-main",
  devtool: "inline-source-map",
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
  config.devtool = undefined;
  config.mode = "production";
}

module.exports = config;