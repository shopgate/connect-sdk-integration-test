const async = require('async')
const processExists = require('process-exists')

/**
 * Checks wether a process was killed
 * @param {integer} pid
 */
function processWasKilled (pid) {
  return new Promise((resolve, reject) => {
    async.retry({
      times: 30,
      interval: 100
    }, (cb) => {
      processExists(pid)
        .then(exists => cb(exists ? new Error(`Process ${pid} still exists`) : null))
        .catch(err => cb(err))
    }, (err) => {
      if (err) return reject(err)
      return resolve()
    })
  })
}

module.exports = { processWasKilled }
