const {assert, exec, tools} = require('../utils')
describe('Login', function () {
  this.timeout(4000)

  beforeEach(async () => {
    return tools.setup()
  })

  afterEach(async () => {
    return tools.cleanup()
  })

  it('should not be possible to login with wrong credentials', (done) => {
    try {
      const command = `${tools.getExecutable()} login --username ${tools.getUsername()} --password foobarbaz1`
      const proc = exec(command)
      const messages = []
      proc.stdout.on('data', (data) => {
        messages.push(JSON.parse(data).msg)
      })

      proc.on('exit', () => {
        assert.ok(messages.includes('Credentials invalid'))
        done()
      })
    } catch (error) {
      console.log(error)
      assert.ok(error)
      done()
    }
  })

  it('should  be possible to login with correct credentials', (done) => {
    try {
      const messages = []
      const command = `${tools.getExecutable()} login --username ${tools.getUsername()} --password ${tools.getPassword()}`
      const proc = exec(command)
      proc.stdout.on('data', (msg) => {
        messages.push(JSON.parse(msg).msg)
      })
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
