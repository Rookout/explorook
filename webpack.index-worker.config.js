const path = require('path');
const { BugsnagSourceMapUploaderPlugin } = require('webpack-bugsnag-plugins');
const package = require('./package.json')

const config = {
  mode: 'development',
  optimization: {
    minimize: false,
    usedExports: false, // Disable tree shaking regarding used exports
    sideEffects: false, // Disable tree shaking regarding side effects in package.json
    concatenateModules: false // This is true by default in production mode in Webpack 5
  },
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
  externals: [ 'electron' ],

  resolve: {
    extensions: ['.mjs', '.ts', '.json', '.js', '.gql', '.graphql']
  },
  output: {
    filename: 'index-worker.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs',
    globalObject: 'this',
    umdNamedDefine: true,
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
