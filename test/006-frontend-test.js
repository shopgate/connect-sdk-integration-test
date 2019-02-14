const assert = require('assert')
const { spawn } = require('child_process')
const fsEx = require('fs-extra')
const got = require('got')
const path = require('path')
const os = require('os')
const utils = require('../lib/utils')

describe('Frontend', () => {
  let frontendProcess

  before('Setup environment', async () => {
    await utils.setup()
    await utils.login()
    await utils.init()
    await utils.startBackend()
  })

  after('Cleanup environment', async () => {
    await utils.cleanup()
    if (frontendProcess) {
      await utils.terminate(frontendProcess)
    }
  })

  it('should setup the frontend', async () => {
    await utils.runner
      .run(`${utils.executable} frontend setup`)
      .on(/Which IP address/).respond('\n')
      .on(/On which port should the app/).respond('\n')
      .on(/On which port should the Rapid/).respond('\n')
      .on(/On which port should the HMR/).respond('\n')
      .on(/On which port should the remote/).respond('\n')
      .on(/development sourcemap/).respond('\n')
      .on(/correct\?/).respond('Y\n')
      .stdout(/FrontendSetup done/)
      .end()

    const frontendJson = await fsEx.readJson(path.join(utils.appDir, '.sgcloud', 'frontend.json'))
    assert.strictEqual(frontendJson.port, 8080)
  })

  it('should be possible to start the frontend, when a theme is installed', async function () {
    this.retries(0)

    const themeDir = path.join(utils.appDir, 'themes', 'theme-gmd-master')
    await utils.downloadGmdTheme()

    await utils.runner
      .cwd(themeDir)
      .run(`${os.platform() === 'win32' ? 'npm.cmd' : 'npm'} i --no-audit --no-package-lock`)
      .end()

    const proc = spawn(utils.executable, ['frontend', 'start'], {
      cwd: utils.workingDir,
      env: utils.env
    })

    try {
      let compiled = false
      await new Promise((resolve, reject) => {
        proc.stdout.on('data', (chunk) => {
          compiled = false
          const log = chunk.toString()
          if (log.includes('webpack: Compiled successfully.')) {
            compiled = true
            proc.stdout.removeAllListeners('data')
            proc.stderr.removeAllListeners('data')
            setTimeout(() => {
              if (compiled) resolve()
            }, 200)
          } else if (log.includes('webpack: Failed to compile.')) {
            proc.stdout.removeAllListeners('data')
            proc.stderr.removeAllListeners('data')
            reject(new Error(log))
          }
        })
      })
      frontendProcess = proc
    } catch (e) {
      await utils.terminate(proc)
      this.skip()
    }
  })

  it.skip('should be possible to open a browser to the specified ip:port and see the theme', async function () {
    if (!frontendProcess) return this.skip()

    const frontentJsonPath = path.join(utils.appDir, '.sgcloud', 'frontend.json')
    const { ip, port } = await fsEx.readJson(frontentJsonPath)
    const { body } = await got.post(`http://${ip}:${port}`)
    assert.ok(body.includes('<script src="/app.js"></script>'))
  })
})
