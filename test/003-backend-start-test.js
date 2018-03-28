const JSONStream = require('JSONStream')
const es = require('event-stream')
const { assert, exec, tools } = require('../utils')
/**
 * @type {IntegrationTestUtils}
 */
describe('Backend Start', function () {
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
      }, 54000)

      let backendPid

      proc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
        if (!backendPid && data.pid) backendPid = data.pid
        messages.push(data.msg)
        if (messages.includes('Backend ready')) {
          if (!killed) {
            killed = true
            clearTimeout(to)
            process.kill(backendPid, 'SIGINT')
          }
        }
      }))

      proc.stderr.on('data', (data) => {
        assert.ifError(data)
        done()
      })

      proc.on('exit', (code) => {
        assert.ok(messages.includes('Backend ready'), 'Expected backend to log a "Backend ready" message.')
        done()
      })
    } catch (err) {
      assert.ifError(err)
    }
  })
})
