const assert = require('assert')
const { spawn, exec, ChildProcess } = require('child_process')
const hasher = require('folder-hash')
const fsEx = require('fs-extra')
const got = require('got')
const Runner = require('./Runner')
const os = require('os')
const path = require('path')
const unzip = require('unzipper')
const { promisify } = require('util')
const config = require('../config')

class IntegrationTestUtils {
  async setup () {
    this._workingDir = await fsEx.mkdtemp(path.join(os.tmpdir(), 'shopgate-sdk-test-'))
    this._env = {
      ...process.env,
      LOG_LEVEL: 'debug',
      PROXY_PORT: '8813',
      APP_PATH: this.appDir,
      USER_DIR: this.userDir
    }

    await fsEx.mkdir(this.userDir)
    await fsEx.mkdir(this.appDir)
  }

  async cleanup () {
    if (this._backendProcess) {
      await this.terminate(this._backendProcess)
      delete this._backendProcess
    }


    await fsEx.remove(this.appDir)
    await fsEx.remove(this.userDir)
    await fsEx.remove(this.workingDir)
    delete this._workingDir
  }

  get env () {
    return this._env
  }

  get workingDir () {
    if (!this._workingDir) throw new Error('Call .setup() first')
    return this._workingDir
  }

  get appDir () {
    return path.join(this.workingDir, 'app')
  }

  get userDir () {
    return path.join(this.workingDir, 'user')
  }

  get executable () {
    return config.executable.replace(/\\/g, '\\\\')
  }

  get username () {
    return config.username
  }

  get password () {
    return config.password
  }

  get appId () {
    return config.appId
  }

  get uploadable () {
    return config.uploadable
  }

  async getSession () {
    return fsEx.readJson(path.join(this.userDir, '.sgcloud', 'session.json'))
  }

  async getDirectoryHash () {
    return hasher.hashElement(this.workingDir)
  }

  login (username, password) {
    return this.runner
      .run(`${this.executable} login --username ${username || this.username} --password ${password || this.password}`)
      .end()
  }

  logout () {
    return this.runner.run(`${this.executable} logout`).end()
  }

  init (appId) {
    return this.runner
      .run(`${this.executable} init --appId ${appId || this.appId}`)
      .stdout(new RegExp(`The Application "${this.appId}" was successfully initialized`))
      .end()
  }

  get backendProcess () {
    return this._backendProcess
  }

  async startBackend () {
    if (!this._backendProcess) {
      const proc = spawn(`${this.executable}`, ['backend', 'start'], {
        cwd: this.workingDir,
        env: this.env
      })

      await new Promise((resolve, reject) => {
        const dataHandler = (chunk) => {
          if (chunk.toString().match(/Backend ready/)) {
            proc.stdout.removeListener('data', dataHandler)
            resolve()
          }
        }

        proc.stdout.on('data', dataHandler)
        proc.on('error', reject)
      })

      this._backendProcess = proc
    }

    return this._backendProcess
  }

  async attachDefaultExtension () {
    const extensionDir = path.join(this.appDir, 'extensions', '@shopgateIntegrationTest-awesomeExtension')
    await fsEx.mkdirp(extensionDir, { mode: '777' })
    await fsEx.copy(path.resolve(__dirname, '..', 'test', 'fixtures', '@shopgateIntegrationTest-awesomeExtension'), extensionDir)

    await this.runner
      .env('INTEGRATION_TEST', 'true')
      .expect((result) => {
        const log = JSON.parse(result.stdout)
        if (!log.msg === 'Attached @shopgateIntegrationTest/awesomeExtension (@shopgateIntegrationTest-awesomeExtension)') {
          return new Error('should have logged attachment of extension')
        }
      })
      .run(`${this.executable} extension attach @shopgateIntegrationTest-awesomeExtension`)
      .end()

    return this.startBackend()
  }

  async downloadGmdTheme () {
    const themesDir = path.resolve(this.appDir, 'themes')
    await fsEx.mkdirp(themesDir)

    await new Promise((resolve, reject) => {
      const zipStream = got.stream('https://github.com/shopgate/theme-gmd/archive/master.zip')
      const extractor = unzip.Extract({ path: themesDir })

      extractor.once('close', resolve)
      extractor.once('error', (err) => reject(new Error(`Error while download theme: ${err.message}`)))

      zipStream.pipe(extractor)
    })
  }

  get runner () {
    const runner = new Runner({ colors: false })

    runner.cwd(this.appDir)
    runner.env(this.env)

    return runner
  }

  async terminate (proc) {
    if (!proc) return
  
    let pid
    if (proc instanceof ChildProcess) {
      pid = proc.pid
      proc.unref()
    } else {
      pid = proc
    }

    try {
      if (!process.kill(pid, 0)) return
    } catch (e) {}

    if (os.platform() === 'win32') {
      const childrenIds = await this.getProcessChildren(pid)

      for (let i, l = childrenIds.length; i < l; i++) {
        await this.terminate(childrenIds[i])
      }

      await promisify(exec)(`taskkill /PID ${pid} /T /F`)
    } else {
      process.kill(pid)
    }

    await new Promise((resolve, reject) => {
      (function check () {
        setTimeout(() => {
          try {
            if (!process.kill(pid, 0)) resolve()
          } catch (err) {
            resolve()
          }
        }, 10)
      })()
    })
  }

  async getProcessChildren (pid) {
    assert.ok(os.platform() === 'win32')
    assert.ok(pid)

    const { stdout } = await promisify(exec)(`wmic process where "ParentProcessId=${pid}" get ProcessId`)
    return stdout.split(/(?:ProcessId)?\s*\r\r\n/g).filter(Boolean)
  }
}

module.exports = new IntegrationTestUtils()
