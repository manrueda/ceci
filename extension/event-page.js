/* global chrome */
import ceciEventPage from '../src/event-page.js'

const { run, reactive } = ceciEventPage('extension/content-script.bundle.js')

chrome.tabs.query({
  url: '*://*.google.com.ar/*'
}, (tabs) => {
  const currentTab = tabs[0]

  window.subscriber = reactive(currentTab.id, (cb, a) => {
    var inter = setInterval(() => cb(null, a), 2000)
    return () => clearInterval(inter)
  }, [10]).subscribe((a) => console.log(a), (a) => console.warn(a))

  window.subscriber2 = reactive(currentTab.id, (cb, a) => {
    var inter = setInterval(() => { cb(new Error('error')) }, 2000)
    return () => clearInterval(inter)
  }, [10]).subscribe((a) => console.log(a), (a) => console.warn(a))

  run(currentTab.id, (a) => a, [10]).then((a) => console.log(a))
  run(currentTab.id, (a) => { throw new Error('error') }, [10]).catch((a) => console.warn(a))
})
