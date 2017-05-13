import uuid from 'uuid/v4'
import hash from 'hash.js'
const storedCode = {}

function executeCode (id, code, params) {
  return codeSafeApply(id, code, params)
    .then(response => returnCodeExecution(response, id))
    .catch(error => errorCodeExecution(error, id))
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
    id: id,
    error: error
  }, '*')
}

function instanceExecuteCode (fn, params) {
  const code = fn.toString()
  return executeCode(uuid(), code, params)
}

export default function () {
  window.addEventListener('message', event => {
    if (event.source !== window) {
      return
    }

    switch (event.data.type) {
      case 'execute-code':
        executeCode(event.data.id, event.data.code, event.data.params)
        break
    }
  }, false)
  return instanceExecuteCode
}
