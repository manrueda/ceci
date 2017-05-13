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
  }, [10]).subscribe(console.log)

  run(currentTab.id, (a) => a, [10]).then(console.log)
})
