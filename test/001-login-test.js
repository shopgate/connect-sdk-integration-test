const JSONStream = require('JSONStream')
const es = require('event-stream')
const { assert, exec, tools } = require('../utils')
describe('Login', function () {
  this.timeout(4000)

  beforeEach(async () => {
    return tools.setup()
  })

  afterEach(async () => {
    return tools.cleanup()
  })

  it('should give an error when no credentials were entered ', (done) => {
    try {
      const command = `${tools.getExecutable()} login --username --password`
      const proc = exec(command)
      const messages = []
      proc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
        messages.push(data.msg)
      }))

      proc.on('exit', () => {
        assert.ok(messages.includes('Login failed'))
        done()
      })
    } catch (error) {
      assert.ok(error)
      done()
    }
  })

  it('should give an error when username is unknown', (done) => {
    try {
      const command = `${tools.getExecutable()} login --username superbaddassusernam@somerandomcorp.com --password secret`
      const proc = exec(command)
      const messages = []
      proc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
        messages.push(data.msg)
      }))

      proc.on('exit', () => {
        assert.ok(messages.includes('Credentials invalid'))
        done()
      })
    } catch (error) {
      assert.ok(error)
      done()
    }
  })
  it('should give an error when password is wrong', (done) => {
    try {
      const command = `${tools.getExecutable()} login --username ${tools.getUsername()} --password foobarbaz1`
      const proc = exec(command)
      const messages = []
      proc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
        messages.push(data.msg)
      }))

      proc.on('exit', () => {
        assert.ok(messages.includes('Credentials invalid'))
        done()
      })
    } catch (error) {
      assert.ok(error)
      done()
    }
  })

  it('should  be possible to login with correct credentials', function (done) {
    try {
      const messages = []
      const command = `${tools.getExecutable()} login --username ${tools.getUsername()} --password ${tools.getPassword()}`
      const proc = tools.execWithTimeout(command)

      proc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
        messages.push(data.msg)
      }))

      proc.stderr.on('data', console.log)

      proc.on('exit', () => {
        assert.ok(messages.includes('Login successful'), 'Login was successful')
        try {
          tools.getSession().then(sessionData => {
            assert.ok(sessionData.token, 'A token is defined')
            done()
          }).catch(err => {
            assert.ifError(err)
          })
        } catch (err) {
          assert.ifError(err)
          done()
        }
      })
    } catch (error) {
      assert.ifError(error)
    }
  })
})
