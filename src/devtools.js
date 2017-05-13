/* global chrome */
import { LIB_UNIQUE_ID } from './common'
import uuid from 'uuid/v4'
import Subscriber from './subscriber'

const pending = {}
let eventPageConnection

function executeFunction (fn, params) {
  return new Promise((resolve, reject) => {
    const code = fn.toString()
    const id = uuid()

    pending[id] = {
      resolve: resolve,
      reject: reject
    }
    eventPageConnection.postMessage({
      tabId: chrome.devtools.inspectedWindow.tabId,
      origin: LIB_UNIQUE_ID,
      type: 'run',
      code: code,
      id: id,
      params: params
    })
  })
}

function executeFunctionReactive (fn, params) {
  const code = fn.toString()
  const id = uuid()
  const subs = new Subscriber(() => {
    eventPageConnection.postMessage({
      tabId: chrome.devtools.inspectedWindow.tabId,
      origin: LIB_UNIQUE_ID,
      type: 'reactive-dispose',
      id: id
    })
    delete pending[id]
  })
  pending[id] = subs

  eventPageConnection.postMessage({
    tabId: chrome.devtools.inspectedWindow.tabId,
    origin: LIB_UNIQUE_ID,
    type: 'reactive',
    code: code,
    id: id,
    params: params
  })

  return subs
}

function returnHandler (message) {
  if (message.origin !== LIB_UNIQUE_ID) {
    return
  }
  if (pending[message.id]) {
    if (message.type === 'error' && message.error) {
      pending[message.id].reject(message.error)
      delete pending[message.id]
    } else if (message.type === 'result' && message.result) {
      pending[message.id].resolve(message.result)
      delete pending[message.id]
    } else if (message.type === 'reactive-result' && message.result) {
      pending[message.id].emit(null, message.result)
    } else if (message.type === 'reactive-error' && message.error) {
      pending[message.id].emit(message.error)
    }
  }
}

export default function () {
  eventPageConnection = chrome.runtime.connect({
    name: LIB_UNIQUE_ID
  })

  eventPageConnection.onMessage.addListener(returnHandler)

  return { run: executeFunction, reactive: executeFunctionReactive }
}
