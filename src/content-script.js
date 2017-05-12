/* global chrome */
import uuid from 'uuid/v4'
const pendingCalls = {}

function executeCode (id, code, params) {
  window.postMessage({
    type: 'execute-code',
    id: id,
    code: code,
    params: params
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
  }
}

function runtimeMessageListener (request, sender, sendResponse) {
  pendingCalls[request.id] = {
    original: request,
    callback: sendResponse
  }
  executeCode(request.id, request.code, request.params)
  return true
}

function instanceExecuteCode (fn, params) {
  return new Promise((resolve, reject) => {
    runtimeMessageListener({
      id: uuid(),
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

export default function (pageAgentScriptUrl) {
  window.addEventListener('message', siteMessageListener, false)

  chrome.runtime.onMessage.addListener(runtimeMessageListener)

  return injectPageAgent(pageAgentScriptUrl).then(() => {
    console.info(`ceci - Page Agent injected: ${new Date()}`)
    return instanceExecuteCode
  }).catch(err => {
    console.warn(`ceci - Page Agent injection error: `, err)
  })
}
