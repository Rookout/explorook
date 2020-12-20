const { BugsnagSourceMapUploaderPlugin } = require('webpack-bugsnag-plugins');
const package = require('../../package.json')
module.exports = {
    webpack: {
        configure: {
          target: 'electron-renderer',
          plugins: process.env.NODE_ENV === 'development' ? [] : [new BugsnagSourceMapUploaderPlugin({
            apiKey: '6e673fda179162f48a2c6b5d159552d2',
            publicPath: '*/app.asar/',
            appVersion: package.version,
            overwrite: true,
          })]
        }
    }
}