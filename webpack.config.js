var path = require('path')

module.exports = [{
  entry: {
    'content-script': './src/content-script.js',
    devtools: './src/devtools.js',
    'event-page': './src/event-page.js',
    'page-agent': './src/page-agent.js'
  },
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: '[name].js'
  }
}, {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: 'index.js',
    library: 'ceci',
    libraryTarget: 'umd',
    umdNamedDefine: true
  }
}]
