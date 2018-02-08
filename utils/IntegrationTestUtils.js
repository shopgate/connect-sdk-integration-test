const util = require('util')
const path = require('path')
const fsEx = require('fs-extra')
const fkrCompany = require('faker').company
const config = require('../config.js')
const execPromise = util.promisify(require('child_process').exec)

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
        '-' + fkrCompany.bsNoun().replace('/', '-')
      const randomPath = path.join(__dirname, '..', randomPart)
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
