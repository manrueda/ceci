/* global chrome */
import uuid from 'uuid/v4'

export function sendCode (tabId, code, params, id) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, {
      code: code,
      id: id,
      params: params
    }, (event) => {
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

export default function instanceExecuteCode (tabId, fn, params) {
  const code = fn.toString()
  return sendCode(tabId, code, params, uuid())
}
