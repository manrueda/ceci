export const LIB_UNIQUE_ID = 'ceci-library'
export const DEBUG = false

export function postMessage (type, payload) {
  window.postMessage({
    type,
    origin: LIB_UNIQUE_ID,
    ...payload
  }, '*')
}
