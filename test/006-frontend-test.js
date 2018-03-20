const JSONStream = require('JSONStream')
const es = require('event-stream')
const fsEx = require('fs-extra')
const request = require('request')
const path = require('path')
const { assert, exec, tools, utils } = require('../utils')

describe('Frontend Setup', function () {
  let backendProcessPid
  before(async () => {
    this.timeout(10000)
    await tools.setup()
    await tools.login()
    await tools.initApp()
    backendProcessPid = await tools.getBackendProcess()
  })

  after(async () => {
    process.kill(backendProcessPid, 'SIGINT')
    await utils.processWasKilled(backendProcessPid)
    const frontendPid = await fsEx.readJson(path.join(tools.getProjectFolder(), '.sgcloud', 'frontend'))
    process.kill(frontendPid.pid, 'SIGINT')
    await utils.processWasKilled(frontendPid.pid)
    return tools.cleanup()
  })

  it('should setup the frontend', function (done) {
    this.timeout(240000)
    const command = `${tools.getExecutable()} frontend setup`
    const proc = exec(command)
    const messages = []

    proc.stdout.on('data', (data) => {
      data = data.replace(
        /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
      const confirmable = ['Which IP address', 'On which port', 'development sourcemap', 'correct?']
      let skipLog = false
      console.log(data)

      confirmable.forEach(pattern => {
        if (data.includes(pattern)) {
          skipLog = true
          return proc.stdin.write('\n')
        }
      })
      skipLog = skipLog || /^\s*$/.test(data)
      if (!skipLog) {
        let message = data
        if (data.startsWith('{')) {
          message = JSON.parse(data).msg
        }
        messages.push(message.trim())
      }
    })

    proc.on('exit', (code) => {
      assert.ok(messages.includes('SUCCESSS: Your ShopgateCloud project is now ready!'), 'Should have been a success')

      fsEx.readJson(path.join(tools.getProjectFolder(), '.sgcloud', 'frontend.json')).then(frontendJson => {
        assert.equal(frontendJson.port, '8080')
        done()
      })
    })
  })

  it('should be possible to start the frontend, when a theme is installed', function (done) {
    this.timeout(600000)
    const themeFolder = path.join(tools.getProjectFolder(), 'themes', 'gmd-theme')
    const ex = async (done) => {
      await fsEx.mkdirp(themeFolder)
      await fsEx.copy(path.join(tools.getRootDir(), 'test', 'fixtures', 'theme-gmd'), themeFolder)

      const proc = exec('npm i', { cwd: themeFolder, stdio: 'ignore' })
      const messages = []

      const startFrontend = async () => {
        const proc = exec(`${tools.getExecutable()} frontend start`)
        proc.stderr.on('data', (chunk) => {
          if (!chunk.includes('No extensions found for')) {
            assert.fail(chunk)
          }
        })
        let isDone = false
        proc.stdout.on('data', (chunk) => {
          if (!isDone && chunk.includes('webpack: Compiled successfully.')) {
            isDone = true
            done()
          }
        })
      }
      proc.on('exit', async (code, signal) => {
        startFrontend()
      })
    }
    ex(done)
  })

  it('should be possible to open a browser to the specified ip:port and see the theme', function (done) {
    fsEx.readJson(path.join(tools.getProjectFolder(), '.sgcloud', 'frontend.json')).then(frontendJson => {
      const url = `http://${frontendJson.ip}:${frontendJson.port}`

      request.get(url, (err, res, body) => {
        assert.ifError(err)
        assert.ok(body.includes('<script src="/app.js"></script>'))
        done()
      })
    })
  })
})
