export default class Subscriber {
  constructor (disposeHandler) {
    this.disposeHandler = disposeHandler
    this.emitHandlers = []
    this.errorHandlers = []
  }

  subscribe (forEmit, forError) {
    if (forEmit) {
      this.emitHandlers.push(forEmit)
    }
    if (forError) {
      this.errorHandlers.push(forError)
    }
    return this
  }

  emit (err, payload) {
    if (err) {
      this.errorHandlers.map(cb => cb(err))
    }
    if (payload) {
      this.emitHandlers.map(cb => cb(payload))
    }
    return this
  }

  dispose () {
    this.disposeHandler()
    delete this.emitHandlers
    delete this.errorHandlers
    return this
  }
}
