/* global chrome */
import instanceExecuteCode, { sendCode } from './page-executer'
const internalChromeUrl = /chrome.*:\/\/.*/i

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
  sendCode(message.tabId, message.code, message.params, message.id).then(result => {
    connection.postMessage({
      result: result,
      id: message.id
    })
  }).catch(error => {
    connection.postMessage({
      error: error,
      id: message.id
    })
  })
}

function runtimeConnectListener (connection) {
  const handler = (message, sender, sendResponse) => devtoolsMessageListener(message, sender, sendResponse, connection)

  connection.onMessage.addListener(handler)
  connection.onDisconnect.addListener(() => connection.onMessage.removeListener(handler))
}

export default function (contentScriptScriptUrl) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => tabChangeListener(tabId, changeInfo, tab, contentScriptScriptUrl))

  chrome.runtime.onConnect.addListener(runtimeConnectListener)

  return instanceExecuteCode
}
