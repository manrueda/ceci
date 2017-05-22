/* global chrome */
import { LIB_UNIQUE_ID, DEBUG } from './common'
import { run, reactive, internalExecuteCode, internalExecuteReactiveCode } from './page-executor'
const internalChromeUrl = /chrome.*:\/\/.*/i
const activeSubscribers = {}

function hasPermissions (url) {
  return new Promise(function (resolve, reject) {
    chrome.permissions.contains({
      origins: [url]
    }, resolve)
  })
}

function injectContentScript (tab, scriptUrl) {
  return new Promise(function (resolve, reject) {
    chrome.tabs.executeScript(tab.id, {
      file: scriptUrl
    }, resolve)
  })
}

function hasBeingInjected (tab) {
  return new Promise(function (resolve, reject) {
    chrome.tabs.executeScript(tab.id, {
      code: `window['${LIB_UNIQUE_ID}']`
    }, (arr) => resolve(!!arr[0]))
  })
}

function getAllTabs () {
  return new Promise(function (resolve, reject) {
    chrome.tabs.query({}, resolve)
  })
}

function tabChangeListener (tabId, changeInfo, tab, scriptUrl) {
  if (changeInfo.status === 'complete' && !internalChromeUrl.test(tab.url)) {
    hasPermissions(tab.url)
      .then(next => {
        if (next) {
          return hasBeingInjected(tab)
        } else {
          return next
        }
      })
      .then(next => {
        if (!next) {
          return injectContentScript(tab, scriptUrl)
        }
      }).then(() => {
        if (DEBUG) {
          console.info(`ceci - Content Script injected: ${new Date()}`)
        }
      }).catch(err => {
        if (DEBUG) {
          console.warn(`ceci - Content Script injection error: `, err)
        }
      })
  }
}

function devtoolsMessageListener (message, sender, sendResponse, connection) {
  if (!message.tabId || message.origin !== LIB_UNIQUE_ID) {
    return
  }
  if (message.type === 'run') {
    internalExecuteCode(message.tabId, message.code, message.params, message.id).then(result => {
      connection.postMessage({
        type: 'result',
        origin: LIB_UNIQUE_ID,
        result,
        id: message.id
      })
    }).catch(error => {
      connection.postMessage({
        origin: LIB_UNIQUE_ID,
        type: 'error',
        error,
        id: message.id
      })
    })
  }
  if (message.type === 'reactive') {
    const subs = internalExecuteReactiveCode(message.tabId, message.code, message.params, message.id)
    subs.subscribe(result => {
      connection.postMessage({
        type: 'reactive-result',
        origin: LIB_UNIQUE_ID,
        result,
        id: message.id
      })
    }, error => {
      connection.postMessage({
        type: 'reactive-error',
        origin: LIB_UNIQUE_ID,
        error,
        id: message.id
      })
    })
    activeSubscribers[message.id] = subs
  }
  if (message.type === 'reactive-dispose' && activeSubscribers[message.id]) {
    activeSubscribers[message.id].dispose()
    delete activeSubscribers[message.id]
  }
}

function runtimeConnectListener (connection) {
  if (connection.name === LIB_UNIQUE_ID) {
    const handler = (message, sender, sendResponse) => devtoolsMessageListener(message, sender, sendResponse, connection)

    connection.onMessage.addListener(handler)
    connection.onDisconnect.addListener(() => connection.onMessage.removeListener(handler))
  }
}

function runtimeInstallListener (scriptUrl) {
  getAllTabs()
  .then(tabs => tabs.filter(tab => !internalChromeUrl.test(tab.url)))
  .then(tabs => Promise.all(tabs.map(tab => hasPermissions(tab.url)
    .then(has => {
      return has ? tab : null
    }))
  ))
  .then(tabs => tabs.filter(tab => !!tab))
  .then(tabs => tabs.forEach(tab => injectContentScript(tab, scriptUrl)))
}

export default function (contentScriptScriptUrl) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => tabChangeListener(tabId, changeInfo, tab, contentScriptScriptUrl))

  chrome.runtime.onInstalled.addListener(() => runtimeInstallListener(contentScriptScriptUrl))
  chrome.runtime.onConnect.addListener(runtimeConnectListener)

  return { run, reactive }
}
