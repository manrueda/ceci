/* global chrome */
import uuid from 'uuid/v4'
import Subscriber from './subscriber'

const pendingCalls = {}
const activeSubscribers = {}

function executeCode (id, code, params) {
  window.postMessage({
    type: 'execute-code',
    id,
    code,
    params
  }, '*')
}

function executeReactiveCode (id, code, params) {
  window.postMessage({
    type: 'execute-code-reactive',
    id,
    code,
    params
  }, '*')
}

function disposeReactiveCode (id) {
  window.postMessage({
    type: 'dispose-code-reactive',
    id
  }, '*')
}

function normalizeData (data) {
  if (data.error.message && data.error.stack) {
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
  if (message.source !== window) {
    return
  }

  let { data } = message
  switch (data.type) {
    case 'execute-return':
      if (pendingCalls[data.id]) {
        pendingCalls[data.id].callback({
          type: 'success',
          return: data.return
        })
      }
      break
    case 'execute-error':
      data = normalizeData(data)
      if (pendingCalls[data.id]) {
        pendingCalls[data.id].callback({
          type: 'error',
          return: data.error
        })
      }
      break
    case 'execute-reactive-emit':
      if (activeSubscribers[data.id]) {
        activeSubscribers[data.id].emit(null, data.payload)
      }
      break
    case 'execute-reactive-error':
      data = normalizeData(data)
      if (activeSubscribers[data.id]) {
        activeSubscribers[data.id].emit(data.error)
      }
      break
  }
}

function runtimeMessageListener (request, sender, sendResponse) {
  // sender.id -> Extension id
  if (request.type === 'run') {
    pendingCalls[request.id] = {
      original: request,
      callback: sendResponse
    }
    executeCode(request.id, request.code, request.params)
    return true
  }
  if (request.type === 'reactive-run') {
    const sub = instanceExecuteCodeReactive(request.code, request.params, request.id)
    sub.subscribe(payload => {
      chrome.runtime.sendMessage(sender.id, {type: 'execute-reactive-emit', payload, id: request.id})
    }, error => {
      chrome.runtime.sendMessage(sender.id, {type: 'execute-reactive-error', error, id: request.id})
    })
  }
  if (request.type === 'reactive-dispose' && activeSubscribers[request.id]) {
    activeSubscribers[request.id].dispose()
  }
}

function instanceExecuteCode (fn, params) {
  return new Promise((resolve, reject) => {
    runtimeMessageListener({
      id: uuid(),
      type: 'run',
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
    disposeReactiveCode(id)
    delete activeSubscribers[id]
  })
  activeSubscribers[id] = subs
  executeReactiveCode(id, fn.toString(), params)
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
