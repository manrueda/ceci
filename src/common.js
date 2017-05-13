export const LIB_UNIQUE_ID = 'ceci-library'

export function postMessage (type, payload) {
  window.postMessage({
    type,
    origin: LIB_UNIQUE_ID,
    ...payload
  }, '*')
}
