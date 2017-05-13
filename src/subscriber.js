export default function Subscriber (disposeHandler) {
  const emitHandlers = []
  const errorHandlers = []

  this.subscribe = (forEmit, forError) => {
    if (forEmit) {
      emitHandlers.push(forEmit)
    }
    if (forError) {
      errorHandlers.push(forError)
    }
    return this
  }

  this.emit = (err, payload) => {
    if (err) {
      errorHandlers.map(cb => cb(err))
    }
    if (payload) {
      emitHandlers.map(cb => cb(payload))
    }
    return this
  }

  this.dispose = () => {
    disposeHandler()
    emitHandlers.splice(0)
    errorHandlers.splice(0)
    return this
  }
}
