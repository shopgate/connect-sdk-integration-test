const async = require('async')
const processExists = require('process-exists')
const unzip = require('unzip')
const request = require('request')
const path = require('path')
const fs = require('fs')
const tools = require('./IntegrationTestUtils')
const childProcess = require('child_process')
/**
 * Checks wether a process was killed
 * @param {integer} pid
 */
function processWasKilled (pid) {
  return new Promise((resolve, reject) => {
    async.retry({
      times: 100,
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
  const zipPath = path.join(tools.getRootDir(), 'test', 'fixtures', 'theme-gmd.zip')
  const url = 'https://github.com/shopgate/theme-gmd/archive/master.zip'
  const inStream = fs.createWriteStream(zipPath)
  const promisifiedReadStream = (stream) => {
    return new Promise((resolve, reject) => {
      stream.on('end', () => {
        resolve('end')
      })
      stream.on('finish', () => {
        resolve('finish')
      })
      stream.on('error', (error) => {
        reject(error)
      })
    })
  }
  request(url).pipe(inStream)
  return promisifiedReadStream(inStream).then(() => (new Promise((resolve, reject) => {
    const extractor = unzip.Extract({ path: path.join(extensionsFolder) })
    extractor.on('close', () => {
      resolve()
    })
    extractor.on('error', (err) => {
      reject(new Error(`Error while downloading theme: ${err.message}`))
    })
    fs.createReadStream(zipPath).pipe(extractor)
  })))
}

function execPromise (command, cwd, logger = null) {
  return new Promise((resolve, reject) => {
    childProcess.exec(command, { env: process.env, cwd: cwd || '.' }, (err, stdout, stderr) => {
      if (logger) logger.info({ command }, stdout)
      if (err || stderr) return reject(err || new Error(stderr))
      resolve(stdout)
    })
  })
}

const killProcess = async (pid) => {
  if (!pid) return
  if (/^win/.test(process.platform)) {
    return execPromise(`taskkill /F /pid ${pid}`)
  }
  return execPromise(`kill ${pid}`)
}

module.exports = { processWasKilled, downloadGmdTheme, killProcess }
