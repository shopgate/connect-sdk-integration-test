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
      proc.stdout.on('data', (data) => {
        messages.push(JSON.parse(data).msg)
        if (messages.includes('Backend ready')) {
          if (!killed) {
            killed = true
            proc.kill()
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

      setTimeout(() => {
        if (!killed) {
          proc.kill()
          killed = true
        }
      }, 28000)
    } catch (err) {
      assert.ifError(err)
    }
  })
})
