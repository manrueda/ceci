import uuid from 'uuid/v4'

function executeCode (id, code, params) {
  return codeSafeApply(id, code, params)
    .then(response => returnCodeExecution(response, id))
    .catch(error => errorCodeExecution(error, id))
}

function codeSafeApply (id, code, params) {
  return new Promise(function (resolve, reject) {
    code = `${code}\n//# sourceURL=ceci://ceci/evals/eval-${id}.js`
    const fn = eval(code)
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
