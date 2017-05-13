import ceciDevtools from '../src/devtools.js'

window.run = ceciDevtools()
let runs = 0

const cls = setInterval(function () {
  (i => {
    console.info(`Start run: ${i}`)
    window.run((a) => {
      return new Promise(function(resolve, reject) {
        setTimeout(() => resolve(a), 1)
      })
    }, [i]).then(a => {
      console.info(`Ends run: ${i} -> return ${a}`)
    })
  })(runs)

  runs++
  if (runs > 20) {
    clearInterval(cls)
  }
}, 1)
