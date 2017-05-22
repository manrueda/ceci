import '../src/content-script.js'
/*
ceciContentScript('extension/page-agent.bundle.js').then(({run, reactive}) => {
  window.subscriber = reactive((cb, a) => {
    var inter = setInterval(() => cb(null, a), 2000)
    return () => clearInterval(inter)
  }, [10]).subscribe((a) => console.log(a), (a) => console.warn(a))

  window.subscriber2 = reactive((cb, a) => {
    var inter = setInterval(() => { cb(new Error('error')) }, 2000)
    return () => clearInterval(inter)
  }, [10]).subscribe((a) => console.log(a), (a) => console.warn(a))

  run((a) => a, [10]).then((a) => console.log(a))
  run((a) => { throw new Error('error') }, [10]).catch((a) => console.warn(a))
})
*/
