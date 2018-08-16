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
    this.appSettingsFolder = path.join(this.workingDir, 'appsettings')
    process.env.APP_PATH = this.appSettingsFolder
    this.userSettingsFolder = path.join(this.workingDir, 'usersettings')
    process.env.USER_PATH = this.userSettingsFolder
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
    await fsEx.mkdirp(this.getWorkingDirRel())
    await fsEx.mkdirp(this.appSettingsFolder)
    await fsEx.mkdirp(this.userSettingsFolder)
    process.chdir(this.getWorkingDirRel())
    process.env.APP_PATH = process.cwd()
  }

  async cleanup () {
    await this.logout()
    process.chdir(this.getRootDir())
    process.chdir(this.getWorkingDirRel())
    if (await fsEx.pathExists(this.appSettingsFolder)) {
      await fsEx.emptyDir(this.appSettingsFolder)
      await fsEx.rmdir(this.appSettingsFolder)
    }

    if (await fsEx.pathExists(this.userSettingsFolder)) {
      await fsEx.emptyDir(this.userSettingsFolder)
      await fsEx.rmdir(this.userSettingsFolder)
    }
    process.chdir(this.getRootDir())
    await fsEx.emptyDir(this.workingDir)
    // await fsEx.rmdir(this.workingDir)
  }

  getAppSettingsFolder () {
    return this.appSettingsFolder
  }

  getUserSettingsFolder () {
    return this.userSettingsFolder
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

  getProjectFolder () {
    return this.getWorkingDirRel()
  }

  async login (username, password) {
    return execPromise(`${this.getExecutable()} login --username ${username || this.getUsername()} --password ${password || this.getPassword()}`,
      { 'cwd': this.getProjectFolder() }
    )
  }

  async logout () {
    return execPromise(`${this.getExecutable()} logout`, { 'cwd': this.getProjectFolder() })
  }

  async initApp (appId) {
    return execPromise(`${this.getExecutable()} init --appId ${appId || this.getAppId()}`, { 'cwd': this.getProjectFolder() })
  }

  async getBackendProcess (username, password, appId) {
    const command = `${this.getExecutable()} backend start`
    const proc = exec(command, { 'cwd': this.getProjectFolder() })

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
      }, 500000)

      // Backend started properly
      let backendPid

      try {
        // proc.stdout.on('data', (data) => console.log(data))
        proc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
          // console.log(data)
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
        console.log(err)
        clearTimeout(timeout)
        reject(err)
      }
    })
  }

  async getSession () {
    try {
      return fsEx.readJson(path.join(this.getUserSettingsFolder(), 'session.json'))
    } catch (err) {
      return {}
    }
  }

  async getDirectoryHash () {
    return hasher.hashElement(this.workingDir)
  }

  getWorkingDirRel () {
    return this.workingDir
  }

  getRootDir () {
    return this.rootDir
  }

  getFixtureExtensionPath (fixture) {
    return path.join(this.getRootDir(), 'test', 'fixtures', fixture)
  }

  async detachExtensions () {
    return new Promise((resolve, reject) => {
      const command = `${this.getExecutable()} extension detach`
      const proc = exec(command)
      proc.on('exit', async (code, signal) => { resolve() })
    })
  }
  async detachAll () {
    return new Promise((resolve, reject) => {
      const command = `${this.getExecutable()} extension detach`
      const proc = exec(command)

      proc.stdout.on('data', (data) => {
        console.log(data)
      })

      proc.on('exit', async (code, signal) => {
        resolve()
      })
    })
  }

  async attachDefaultExtension () {
    const extensionFolder = path.join(this.getProjectFolder(), 'extensions', '@shopgateIntegrationTest-awesomeExtension')
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
        resolve()
      })
    })
  }
}

module.exports = new IntegrationTestUtils()
