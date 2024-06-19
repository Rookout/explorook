const path = require('path');

const config = {
  mode: 'development',
  entry: './src/index-worker.ts',
  target: "electron-renderer",
  devtool: 'source-map',
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
      },
      // Solves a graphql-tools related issue: https://github.com/ardatan/graphql-tools/issues/3325
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: "javascript/auto"
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
  config.mode = "production";
}

module.exports = config;
