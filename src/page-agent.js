import hash from 'hash.js'
import { LIB_UNIQUE_ID } from './common'
const storedCode = {}
const reactiveDisposers = {}

function executeCode (id, code, params) {
  return codeSafeApply(id, code, params)
    .then(response => returnCodeExecution(response, id))
    .catch(error => errorCodeExecution(error, id))
}

function executeReactiveCode (id, code, params) {
  params = [(err, payload) => {
    if (err) {
      reactiveError(err, id)
    } else {
      reactiveEmit(payload, id)
    }
  }, ...params]
  codeSafeApply(id, code, params)
    .then(disposer => {
      reactiveDisposers[id] = disposer
    })
    .catch(error => reactiveError(error, id))
}

function parseCode (code, hash) {
  let protectedCode = `(${code})`
  let fn = eval(protectedCode) // eslint-disable-line no-eval
  let commentedCode = `${protectedCode}\n//# sourceURL=ceci://ceci/${fn.name || 'anon'}-${hash}.js`
  fn = eval(commentedCode) // eslint-disable-line no-eval
  return fn
}

function codeSafeApply (id, code, params) {
  return new Promise(function (resolve, reject) {
    let fn
    let codeHash = hash.sha256().update(code).digest('hex')

    if (storedCode[codeHash]) {
      fn = storedCode[codeHash]
    } else {
      storedCode[codeHash] = fn = parseCode(code, codeHash)
    }

    try {
      let response = fn.apply(window, params)
      if (response instanceof Promise) {
        response.then(resolve).catch(reject)
      } else {
        resolve(response)
      }
    } catch (error) {
      reject(error)
    }
  })
}

function returnCodeExecution (response, id) {
  window.postMessage({
    type: 'execute-return',
    origin: LIB_UNIQUE_ID,
    id: id,
    return: response
  }, '*')
}

function errorCodeExecution (error, id) {
  if (error instanceof Error) {
    error = {
      message: error.message,
      stack: error.stack
    }
  }
  window.postMessage({
    type: 'execute-error',
    origin: LIB_UNIQUE_ID,
    id: id,
    error: error
  }, '*')
}

function reactiveEmit (payload, id) {
  window.postMessage({
    type: 'execute-reactive-emit',
    origin: LIB_UNIQUE_ID,
    id: id,
    payload: payload
  }, '*')
}

function reactiveError (error, id) {
  window.postMessage({
    type: 'execute-reactive-error',
    origin: LIB_UNIQUE_ID,
    id: id,
    error: error
  }, '*')
}

export default function () {
  window.addEventListener('message', event => {
    if (event.source !== window || event.data.origin !== LIB_UNIQUE_ID) {
      return
    }

    switch (event.data.type) {
      case 'execute-code':
        executeCode(event.data.id, event.data.code, event.data.params)
        break
      case 'execute-code-reactive':
        executeReactiveCode(event.data.id, event.data.code, event.data.params)
        break
      case 'dispose-code-reactive':
        if (reactiveDisposers[event.data.id]) {
          reactiveDisposers[event.data.id]()
        }
        break
    }
  }, false)
}
