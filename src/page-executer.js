/* global chrome */
import uuid from 'uuid/v4'
import Subscriber from './subscriber'
const activeSubscribers = {}

chrome.runtime.onMessage.addListener(message => {
  if (activeSubscribers[message.id]) {
    if (message.type === 'execute-reactive-emit') {
      activeSubscribers[message.id].emit(null, message.payload)
    }
    if (message.type === 'execute-reactive-error') {
      activeSubscribers[message.id].emit(message.error)
    }
  }
})

function sendMessage (tabId, code, params, id, type, cb) {
  chrome.tabs.sendMessage(tabId, {
    code,
    type,
    id,
    params
  }, cb)
}

export function internalExecuteCode (tabId, code, params, id) {
  return new Promise((resolve, reject) => {
    sendMessage(tabId, code, params, id, 'run', event => {
      if (!event) {
        return
      }
      if (event.type === 'success') {
        resolve(event.return)
      } else if (event.type === 'error') {
        reject(event.error)
      }
    })
  })
}

export function internalExecuteReactiveCode (tabId, code, params, id) {
  const subs = new Subscriber(() => {
    sendMessage(tabId, null, null, id, 'reactive-dispose')
    delete activeSubscribers[id]
  })
  activeSubscribers[id] = subs
  sendMessage(tabId, code, params, id, 'reactive-run')
  return subs
}

export function executeCode (tabId, fn, params) {
  const code = fn.toString()
  return internalExecuteCode(tabId, code, params, uuid())
}

export function executeReactiveCode (tabId, fn, params) {
  const code = fn.toString()
  return internalExecuteReactiveCode(tabId, code, params, uuid())
}
