import ceciContentScript from '../src/content-script.js'

ceciContentScript('extension/page-agent.bundle.js').then(run => {

}).catch(console.warn)
