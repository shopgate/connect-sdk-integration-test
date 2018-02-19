const {assert, exec, tools} = require('../utils')

describe('App init', () => {
  beforeEach(async () => {
    await tools.setup()
    await tools.login()
  })

  afterEach(async () => {
    return tools.cleanup()
  })

  it('should be possible to init', function (done) {
    this.timeout(5000)
    try {
      const command = `${tools.getExecutable()} init --appId ${tools.getAppId()}`
      const proc = exec(command)
      const messages = []
      proc.stdout.on('data', (data) => {
        try {
          const message = JSON.parse(data).msg
          messages.push(message)
        } catch (err) {
          messages.push(data)
        }
      })

      proc.on('exit', (code) => {
        assert.equal(code, 0)
        assert.ok(messages.includes(`The Application "${tools.getAppId()}" was successfully initialized`))
        done()
      })

      proc.stderr.on('data', (err) => {
        assert.ifError(err)
        done()
      })
    } catch (err) {
      assert.ifError(err)
      done()
    }
  })
})
