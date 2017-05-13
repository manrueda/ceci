/* global chrome */
import { LIB_UNIQUE_ID } from './common'
import { executeCode, executeReactiveCode, internalExecuteCode, internalExecuteReactiveCode } from './page-executer'
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

function tabChangeListener (tabId, changeInfo, tab, scriptUrl) {
  if (changeInfo.status === 'complete' && !internalChromeUrl.test(tab.url)) {
    hasPermissions(tab.url)
      .then(has => {
        if (has) {
          return injectContentScript(tab, scriptUrl)
        }
      }).then(() => {
        console.info(`ceci - Content Script injected: ${new Date()}`)
      }).catch(err => {
        console.warn(`ceci - Content Script injection error: `, err)
      })
  }
}

function devtoolsMessageListener (message, sender, sendResponse, connection) {
  if (!message.tabId) {
    return
  }
  if (message.type === 'run') {
    internalExecuteCode(message.tabId, message.code, message.params, message.id).then(result => {
      connection.postMessage({
        type: 'result',
        result,
        id: message.id
      })
    }).catch(error => {
      connection.postMessage({
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
        result,
        id: message.id
      })
    }, error => {
      connection.postMessage({
        type: 'reactive-error',
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

export default function (contentScriptScriptUrl) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => tabChangeListener(tabId, changeInfo, tab, contentScriptScriptUrl))

  chrome.runtime.onConnect.addListener(runtimeConnectListener)

  return { run: executeCode, reactive: executeReactiveCode }
}
