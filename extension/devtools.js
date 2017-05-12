import ceciDevtools from '../src/devtools.js'

window.run = ceciDevtools()

window.run((a) => {
  return new Promise(function(resolve, reject) {
    resolve(a)
  })
}, [33]).then(console.log)
