const JSONStream = require('JSONStream')
const es = require('event-stream')
const { assert, exec, tools, utils } = require('../utils')
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
      let backendPid

      const to = setTimeout(() => {
        if (!killed) {
          proc.kill()
          utils.killProcess(backendPid)
          killed = true
        }
      }, 54000)

      proc.stdout.pipe(JSONStream.parse()).pipe(es.map(async data => {
        if (!backendPid && data.pid) backendPid = data.pid
        messages.push(data.msg)
        if (messages.includes('Backend ready')) {
          if (!killed) {
            killed = true
            try {
              proc.kill()
              await utils.killProcess(backendPid)
              await utils.processWasKilled(backendPid)
              clearTimeout(to)
            } catch (err) {
              err.message += ' ' + messages.join('\n')
              done(err)
            }
          }
        }
      }))

      proc.stderr.on('data', (data) => {
        assert.ifError(data)
        done()
      })

      proc.on('exit', async (code) => {
        assert.ok(messages.includes('Backend ready'), 'Expected backend to log a "Backend ready" message. The log was:' + messages.join('\n'))
        try {
          proc.kill()
          await utils.processWasKilled(backendPid)
          done()
        } catch (err) {
          err.message += ' ' + messages.join('\n')
          done(err)
        }
      })
    } catch (err) {
      assert.ifError(err)
      done()
    }
  })
})
