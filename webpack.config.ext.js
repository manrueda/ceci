const path = require('path')

module.exports = {
  entry: {
    'content-script': './extension/content-script.js',
    devtools: './extension/devtools.js',
    'event-page': './extension/event-page.js',
    'page-agent': './extension/page-agent.js'
  },
  devtool: 'source-map',
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' }
    ]
  },
  output: {
    path: path.resolve(__dirname, 'extension'),
    filename: '[name].bundle.js'
  }
}
