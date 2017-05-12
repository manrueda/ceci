import ceciContentScript from '../src/content-script.js'

ceciContentScript('extension/page-agent.bundle.js').then(run => {
  window.run = run
  run((a) => {
    return new Promise(function(resolve, reject) {
      resolve(a)
    })
  }, [22]).then(console.log)
}).catch(console.warn)
