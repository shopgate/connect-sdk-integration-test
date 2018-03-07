const util = require('util')
const path = require('path')
const fsEx = require('fs-extra')
const fkrCompany = require('faker').company
const config = require('../config.js')
const exec = require('child_process').exec
const execPromise = util.promisify(require('child_process').exec)
const JSONStream = require('JSONStream')
const es = require('event-stream')

class IntegrationTestUtils {
  constructor () {
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
    await fsEx.mkdirp(this.getWorkingDirRel())
    await fsEx.mkdirp(this.appSettingsFolder)
    await fsEx.mkdirp(this.userSettingsFolder)
    process.chdir(this.getRootDir())
    process.chdir(this.getWorkingDirRel())
  }

  async cleanup () {
    process.chdir('../')
    if (await fsEx.pathExists(this.appSettingsFolder)) {
      await fsEx.emptyDir(this.appSettingsFolder)
      await fsEx.rmdir(this.appSettingsFolder)
      await fsEx.emptyDir(this.workingDir)
      await fsEx.rmdir(this.workingDir)
    }

    if (await fsEx.pathExists(this.userSettingsFolder)) {
      await fsEx.emptyDir(this.userSettingsFolder)
      await fsEx.rmdir(this.userSettingsFolder)
    }
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

  async login (username, password) {
    return execPromise(`${this.getExecutable()} login --username ${username || this.getUsername()} --password ${password || this.getPassword()}`)
  }

  async initApp (appId) {
    return execPromise(`${this.getExecutable()} init --appId ${appId || this.getAppId()}`)
  }

  async getBackendProcess (username, password, appId) {
    const command = `${this.getExecutable()} backend start`
    const proc = exec(command)

    let timeout = null

    return new Promise((resolve, reject) => {
      // Timeout if process did not start
      timeout = setTimeout(() => {
        proc.stdout.removeAllListeners()
        reject(new Error('Backend did not start properly'))
      }, 10000)

      // Backend started properly
      let backendPid

      proc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
        if (!backendPid && data.pid) backendPid = data.pid

        if (data.msg.includes('Backend ready')) {
          clearTimeout(timeout)
          resolve(backendPid)
        }
      }))
    })
  }

  async getSession () {
    try {
      return fsEx.readJson(path.join(this.getUserSettingsFolder(), 'session.json'))
    } catch (err) {
      return {}
    }
  }

  getWorkingDirRel () {
    return this.workingDir
  }

  getRootDir () {
    return this.rootDir
  }
}

module.exports = new IntegrationTestUtils()
