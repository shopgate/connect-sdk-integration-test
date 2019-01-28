const fsEx = require('fs-extra')
const request = require('request')
const path = require('path')
const { assert, exec, tools, utils } = require('../utils')
const processExists = require('process-exists')
const downloadGmdTheme = utils.downloadGmdTheme

describe('Frontend Setup', function () {
  let backendProcessPid
  before(async () => {
    await tools.setup()
    await tools.login()
    await tools.initApp()
    backendProcessPid = await tools.getBackendProcess()
  })

  after(async () => {
    try {
      const frontendPid = await fsEx.readJson(path.join(tools.getAppDirectory(), '.sgcloud', 'frontend'))
      if (frontendPid && await processExists(frontendPid.pid)) {
        try {
          process.kill(frontendPid.pid, 'SIGINT')
        } catch (err) {
          console.log(err)
        }

        await utils.processWasKilled(frontendPid)
      }
    } catch (err) {

    }

    if (await processExists(backendProcessPid)) {
      try {
        process.kill(backendProcessPid, 'SIGINT')
      } catch (err) {
        console.log(err)
      }

      await utils.processWasKilled(backendProcessPid)
      backendProcessPid = null
    }

    return tools.cleanup()
  })

  it('should setup the frontend', function (done) {
    const command = `${tools.getExecutable()} frontend setup`
    const proc = exec(command)
    const messages = []
    const answered = []
    proc.stdout.on('data', (data) => {
      const confirmable = ['Which IP address', 'On which port should the app',
        'On which port should the Rapid', 'On which port should the HMR',
        'On which port should the remote', 'development sourcemap', 'correct?']
      let skipLog = false

      confirmable.forEach(pattern => {
        if (data.includes(pattern) && !answered.includes(pattern)) {
          skipLog = true
          if (data.includes('correct?')) {
            proc.stdin.write('Y\n')
          } else {
            proc.stdin.write('\n')
          }
          answered.push(pattern)
        }
      })
      skipLog = skipLog || /^\s*$/.test(data)
      if (!skipLog) {
        let message = data
        if (data.startsWith('{')) {
          try {
            message = JSON.parse(data).msg
          } catch (err) {
            message = data
          }
        }
        messages.push(message.trim())
      }
    })

    proc.on('exit', (code, signal) => {
      assert.ok(messages.includes('FrontendSetup done'), 'Should have been a success')
      fsEx.readJson(path.join(tools.getAppDirectory(), '.sgcloud', 'frontend.json')).then(frontendJson => {
        assert.equal(frontendJson.port, '8080')
        done()
      }).catch(err => console.log(err))
    })
  })

  it('should be possible to start the frontend, when a theme is installed', async () => {
    const themeDir = path.join(tools.getAppDirectory(), 'themes', 'theme-gmd-master')

    await downloadGmdTheme(path.join(tools.getAppDirectory(), 'themes'))
    await new Promise((resolve, reject) => {
      const proc = exec('npm i --only=production --no-audit --no-package-lock', { cwd: themeDir })
      proc.on('error', (err) => reject(err))
      proc.on('exit', (code) => (code && reject(code)) || resolve())
    })
    await new Promise((resolve, reject) => {
      const pkg = require(path.join(themeDir, 'package.json'))
      const { cypress, ...devDependencies } = pkg.devDependencies
      const devPackages = Object.keys(devDependencies).join(' ')
      const proc = exec(`npm i --no-save --no-audit --no-package-lock ${devPackages}`, { cwd: themeDir })
      proc.on('error', (err) => reject(err))
      proc.on('exit', (code) => (code && reject(code)) || resolve())
    })

    await new Promise((resolve, reject) => {
      const proc = exec(`${tools.getExecutable()} frontend start`)
      let isDone = false

      proc.stdout.on('data', (chunk) => {
        if (!isDone && chunk.includes('webpack: Compiled successfully.')) {
          isDone = true
          proc.stdout.removeAllListeners('data')
          proc.stderr.removeAllListeners('data')
          resolve()
        }
      })

      proc.stderr.on('data', (chunk) => {
        if (!chunk.includes('No extensions found for')) {
          assert.fail(chunk)
        }
      })
    })
  })

  it('should be possible to open a browser to the specified ip:port and see the theme', function (done) {
    fsEx.readJson(path.join(tools.getAppDirectory(), '.sgcloud', 'frontend.json')).then(frontendJson => {
      const url = `http://${frontendJson.ip}:${frontendJson.port}`

      request.get(url, (err, res, body) => {
        assert.ifError(err)
        assert.ok(body.includes('<script src="/app.js"></script>'))
        done()
      })
    })
  })
})
