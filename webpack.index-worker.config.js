const path = require('path');

const config = {
  mode: 'development',
  entry: './src/index-worker.ts',
  target: "electron-renderer",
  devtool: 'inline-source-map',
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
      },
      {
        // fix https://github.com/ashtuchkin/iconv-lite/issues/204
        test: /node_modules[\/\\](iconv-lite)[\/\\].+/,
        resolve: {
          aliasFields: ['main']
        }
      }
    ]
  },
  resolve: {
    extensions: ['.mjs', '.ts', '.json', '.js', '.gql', '.graphql']
  },
  output: {
    filename: 'index-worker.js',
    path: path.resolve(__dirname, 'dist')
  }
};

if (!process.env.development) {
  config.devtool = undefined;
  config.mode = "production";
}

module.exports = config;