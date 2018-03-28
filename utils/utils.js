const async = require('async')
const processExists = require('process-exists')
const unzip = require('unzip')
const path = require('path')
const fs = require('fs')
const tools = require('./IntegrationTestUtils')
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

const downloadGmdTheme = async (extensionsFolder) => {
  const url = 'https://github.com/shopgate/theme-gmd/archive/master.zip'
  return new Promise((resolve, reject) => {
    const extractor = unzip.Extract({ path: path.join(extensionsFolder) })
    extractor.on('close', () => {
      resolve()
    })
    extractor.on('error', (err) => {
      reject(new Error(`Error while downloading theme: ${err.message}`))
    })
    fs.createReadStream(path.join(tools.getRootDir(), 'test', 'fixtures', 'theme-gmd.zip')).pipe(extractor)
  })
}

module.exports = { processWasKilled, downloadGmdTheme }
