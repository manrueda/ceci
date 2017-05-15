const path = require('path')
const extWebpack = require('./webpack.config.ext.js')

module.exports = [{
  entry: {
    'content-script': './src/content-script.js',
    devtools: './src/devtools.js',
    'event-page': './src/event-page.js',
    'page-agent': './src/page-agent.js',
    'page-executor': './src/page-executor.js',
    subscriber: './src/subscriber.js',
    index: './src/index.js'
  },
  devtool: 'source-map',
  externals: {
    'uuid/v4': 'uuid/v4',
    'hash.js': 'hash.js'
  },
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' }
    ]
  },
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: '[name].es5.js'
  }
}, extWebpack]
