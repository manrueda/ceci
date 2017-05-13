import ceciContentScript from '../src/content-script.js'

ceciContentScript('extension/page-agent.bundle.js').then(({run, reactive}) => {
  window.subscriber = reactive((cb, a) => {
    var inter = setInterval(() => cb(null, a), 2000)
    return () => clearInterval(inter)
  }, [10]).subscribe(console.log)

  run((a) => a, [10]).then(console.log)
})
