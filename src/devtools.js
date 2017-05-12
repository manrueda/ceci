/* global chrome */
import { LIB_UNIQUE_ID } from './common'
import uuid from 'uuid/v4'

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
      code: code,
      id: id,
      params: params
    })
  })
}

function returnHandler (message) {
  if (pending[message.id]) {
    if (message.error) {
      pending[message.id].reject(message.error)
    } else if (message.result) {
      pending[message.id].resolve(message.result)
    }
    delete pending[message.id]
  }
}

export default function () {
  eventPageConnection = chrome.runtime.connect({
    name: LIB_UNIQUE_ID
  })

  eventPageConnection.onMessage.addListener(returnHandler)

  return executeFunction
}
