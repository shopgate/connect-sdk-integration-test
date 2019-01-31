const util = require('util')
const path = require('path')
const fsEx = require('fs-extra')
const fkrCompany = require('faker').company
const config = require('../config.js')
const exec = require('child_process').exec
const execPromise = util.promisify(require('child_process').exec)
const JSONStream = require('JSONStream')
const es = require('event-stream')
const hasher = require('folder-hash')

class IntegrationTestUtils {
  constructor () {
    this.currentBackendProcess = null
    this.workingDir = IntegrationTestUtils.getUnusedRandomPath()
    this.rootDir = path.join(__dirname, '..')
    this.appDirectory = path.join(this.workingDir, 'app')
    this.userDirectory = path.join(this.workingDir, 'user')

    process.env.APP_PATH = this.appDirectory
    process.env.USER_DIR = this.userDirectory
  }

  static getUnusedRandomPath () {
    while (true) {
      const randomPart = fkrCompany.bsAdjective().replace('/', '-') +
        '-' + fkrCompany.bsNoun().replace('/', '-').replace(' ', '')
      const randomPath = path.join(__dirname, '..', 'test_environment', randomPart)
      if (!fsEx.pathExistsSync(randomPath)) {
        return randomPath
      }
    }
  }

  async setup () {
    process.chdir(this.getRootDir())
    await fsEx.mkdirp(this.getWorkingDir())
    await fsEx.mkdirp(this.appDirectory)
    await fsEx.mkdirp(this.userDirectory)
    process.chdir(this.getWorkingDir())
  }

  async cleanup () {
    await this.logout()
    process.chdir(this.getRootDir())
    await fsEx.remove(this.getWorkingDir())
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  getAppDirectory () {
    return this.appDirectory
  }

  getUserDirectory () {
    return this.userDirectory
  }

  getAppId () {
    return config.appId
  }

  getUsername () {
    return config.username
  }

  getPassword () {
    return config.password
  }

  getExecutable () {
    return config.executable
  }

  async login (username, password) {
    return execPromise(`${this.getExecutable()} login --username ${username || this.getUsername()} --password ${password || this.getPassword()}`,
      { 'cwd': this.getAppDirectory() }
    )
  }

  async logout () {
    return execPromise(`${this.getExecutable()} logout`, { 'cwd': this.getAppDirectory() })
  }

  async initApp (appId) {
    return execPromise(`${this.getExecutable()} init --appId ${appId || this.getAppId()}`, { 'cwd': this.getAppDirectory() })
  }

  async getBackendProcess (username, password, appId) {
    const command = `${this.getExecutable()} backend start`
    const proc = exec(command, { 'cwd': this.getAppDirectory() })

    let timeout = null

    return new Promise((resolve, reject) => {
      const trace = []
      const start = new Date()
      trace.push(start)
      // Timeout if process did not start
      timeout = setTimeout(() => {
        proc.stdout.removeAllListeners()
        trace.push(new Date())
        console.log(trace)
        reject(new Error('Backend did not start properly'))
      }, 90000)

      // Backend started properly
      let backendPid

      try {
        proc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
          if (!backendPid && data.pid) backendPid = data.pid

          if (data.msg.includes('Backend ready')) {
            clearTimeout(timeout)
            proc.stdout.removeAllListeners()
            this.currentBackendProcess = proc
            resolve(backendPid)
          } else {
            trace.push(data)
          }
        }))
      } catch (err) {
        trace.push(err)
        clearTimeout(timeout)
        reject(err)
      }
    })
  }

  async getSession () {
    try {
      return fsEx.readJson(path.join(this.getUserDirectory(), '.sgcloud', 'session.json'))
    } catch (err) {
      return {}
    }
  }

  async getDirectoryHash () {
    return hasher.hashElement(this.workingDir)
  }

  getWorkingDir () {
    return this.workingDir
  }

  getRootDir () {
    return this.rootDir
  }

  getFixtureExtensionPath (fixture) {
    return path.join(this.getRootDir(), 'test', 'fixtures', fixture)
  }

  async attachDefaultExtension () {
    const extensionFolder = path.join(this.getAppDirectory(), 'extensions', '@shopgateIntegrationTest-awesomeExtension')
    await fsEx.mkdirp(extensionFolder)
    await fsEx.copy(path.join(this.getRootDir(), 'test', 'fixtures', '@shopgateIntegrationTest-awesomeExtension'), extensionFolder)

    return new Promise((resolve, reject) => {
      const command = `${this.getExecutable()} extension attach @shopgateIntegrationTest-awesomeExtension`
      const proc = exec(command)

      let attached = false
      proc.stdout.on('data', (data) => {
        if (!attached) {
          if (JSON.parse(data).msg.includes('Attached @shopgateIntegrationTest/awesomeExtension (@shopgateIntegrationTest-awesomeExtension)')) {
            attached = true
          }
        }
      })

      proc.on('exit', async (code, signal) => {
        try {
          const pid = await this.getBackendProcess()

          if (code) {
            return reject(signal)
          }
          resolve(pid)
        } catch (error) {
          return reject(error)
        }
      })
    })
  }
}

module.exports = new IntegrationTestUtils()
