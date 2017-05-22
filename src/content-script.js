/* global chrome */
import uuid from 'uuid/v4'
import { LIB_UNIQUE_ID, postMessage } from './common'
import Subscriber from './subscriber'

const pendings = {}

function normalizeData (data) {
  if (data.error && data.error.message && data.error.stack) {
    const stack = data.error.stack
    data.error = new Error(data.error.message)
    data.error.stack = stack
  }
  return data
}

function injectPageAgent (scriptUrl) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const url = chrome.runtime.getURL(scriptUrl)
    const target = document.head || document.documentElement

    script.src = url
    target.appendChild(script)
    script.onload = () => {
      resolve()
      script.remove()
    }
    script.onerror = error => {
      reject(error)
      script.remove()
    }
  })
}

function siteMessageListener (message) {
  if (message.source !== window || message.data.origin !== LIB_UNIQUE_ID) {
    return
  }

  let { data } = message
  switch (data.type) {
    case 'execute-error':
    case 'execute-return':
      data = normalizeData(data)
      if (pendings[data.id]) {
        pendings[data.id].callback({
          type: data.type === 'execute-error' ? 'error' : 'success',
          return: data.error || data.return
        })
      }
      break
    case 'execute-reactive-emit':
    case 'execute-reactive-error':
      data = normalizeData(data)
      if (pendings[data.id]) {
        pendings[data.id].emit(data.error, data.payload)
      }
      break
  }
}

function runtimeMessageListener (request, sender, sendResponse) {
  if (request.origin !== LIB_UNIQUE_ID) {
    return
  }
  if (request.type === 'run') {
    pendings[request.id] = {
      original: request,
      callback: sendResponse
    }
    postMessage('execute-code', {
      id: request.id,
      code: request.code,
      params: request.params
    })
    return true
  }
  if (request.type === 'reactive-run') {
    const sub = instanceExecuteCodeReactive(request.code, request.params, request.id)
    sub.subscribe(payload => {
      chrome.runtime.sendMessage(sender.id, {type: 'execute-reactive-emit', payload, id: request.id, origin: LIB_UNIQUE_ID})
    }, error => {
      chrome.runtime.sendMessage(sender.id, {type: 'execute-reactive-error', error, id: request.id, origin: LIB_UNIQUE_ID})
    })
  }
  if (request.type === 'reactive-dispose' && pendings[request.id]) {
    pendings[request.id].dispose()
  }
}

function instanceExecuteCode (fn, params) {
  return new Promise((resolve, reject) => {
    runtimeMessageListener({
      id: uuid(),
      type: 'run',
      origin: LIB_UNIQUE_ID,
      code: fn.toString(),
      params
    }, null, (response) => {
      if (response.type === 'error') {
        reject(response.return)
      } else if (response.type === 'success') {
        resolve(response.return)
      }
    })
  })
}

function instanceExecuteCodeReactive (fn, params, id) {
  id = id || uuid()
  const subs = new Subscriber(() => {
    postMessage('dispose-code-reactive', {
      id
    })
    delete pendings[id]
  })
  pendings[id] = subs
  postMessage('execute-code-reactive', {
    id,
    code: fn.toString(),
    params: params
  })
  return subs
}

export default function (pageAgentScriptUrl) {
  window.addEventListener('message', siteMessageListener, false)

  chrome.runtime.onMessage.addListener(runtimeMessageListener)

  return injectPageAgent(pageAgentScriptUrl).then(() => {
    console.info(`ceci - Page Agent injected: ${new Date()}`)
    return { run: instanceExecuteCode, reactive: instanceExecuteCodeReactive }
  }).catch(err => {
    console.warn(`ceci - Page Agent injection error: `, err)
  })
}
