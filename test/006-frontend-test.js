const JSONStream = require('JSONStream')
const es = require('event-stream')
const fsEx = require('fs-extra')
const request = require('request')
const path = require('path')
const { assert, exec, tools, utils } = require('../utils')
const downloadGmdTheme = utils.downloadGmdTheme

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
    const answered = []
    proc.stdout.on('data', (data) => {

      const confirmable = ['Which IP address', 'On which port should the app',
      'On which port should the Rapid', 'On which port should the HMR',
      'On which port should the remote', 'development sourcemap', 'correct?']
      let skipLog = false



      confirmable.forEach(pattern => {
        if (data.includes(pattern) && !answered.includes(pattern)) {
          skipLog = true
	        if(data.includes('correct?')) {
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
          message = JSON.parse(data).msg
        }
        messages.push(message.trim())
      }
    })


    proc.stderr.on('data' ,console.log)
    proc.on('exit', (code, signal) => {
      assert.ok(messages.includes('SUCCESSS: Your ShopgateCloud project is now ready!'), 'Should have been a success')

      fsEx.readJson(path.join(tools.getProjectFolder(), '.sgcloud', 'frontend.json')).then(frontendJson => {
        assert.equal(frontendJson.port, '8080')
        done()
      }).catch(err => console.log(err))
    })
  })

  it('should be possible to start the frontend, when a theme is installed', function (done) {
    this.timeout(600000)
    const themeFolder = path.join(tools.getProjectFolder(), 'themes', 'gmd-theme')
    const ex = async (done) => {
      await downloadGmdTheme(path.join(tools.getProjectFolder(), 'themes'))
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

      proc.stderr.on('data', console.log)
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
