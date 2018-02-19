const {assert, exec, tools} = require('../utils')
/**
 * @type {IntegrationTestUtils}
 */
describe('Backend Start', function () {
  this.timeout(10000)

  beforeEach(async () => {
    return new Promise((resolve, reject) => {
      tools.setup()
        .then(() => tools.login())
        .then(() => tools.initApp())
        .then(() => resolve())
        .catch(err => reject(err))
    })
  })

  afterEach(async () => {
    return tools.cleanup()
  })

  it('should be possible to start the backend', function (done) {
    // noinspection JSPotentiallyInvalidUsageOfThis
    this.timeout(30000)
    try {
      let killed = false
      const command = `${tools.getExecutable()} backend start`
      let proc = exec(command)
      const messages = []

      const to = setTimeout(() => {
        if (!killed) {
          proc.kill()
          killed = true
        }
      }, 28000)

      let backendPid
      proc.stdout.on('data', (data) => {
        const parsedData = JSON.parse(data)
        if (!backendPid && parsedData.pid) backendPid = parsedData.pid
        messages.push(parsedData.msg)
        if (messages.includes('Backend ready')) {
          if (!killed) {
            killed = true
            clearTimeout(to)
            process.kill(backendPid, 'SIGINT')
          }
        }
      })

      proc.stderr.on('data', (data) => {
        assert.ifError(data)
        done()
      })

      proc.on('close', (code) => {
        assert.equal(code, null)
        assert.ok(messages.includes('Backend ready'), 'Backend is ready')
        done()
      })
    } catch (err) {
      assert.ifError(err)
    }
  })
})
