const JSONStream = require('JSONStream')
const es = require('event-stream')
const { assert, exec, tools, cmd } = require('../utils')
describe('Login', function () {
  beforeEach(async () => {
    return tools.setup()
  })

  afterEach(async () => {
    return tools.cleanup()
  })

  it('should give an error when no credentials were entered ', async () => {
    return new Promise(async (resolve, reject) => {
      try {
        const childProcess = await cmd.createProcess(tools.getExecutable(), ['login', '--username', '--password'])
        childProcess.stdin.setEncoding('utf-8')
        childProcess.stdout.pipe(JSONStream.parse()).pipe(es.map(log => {
          if (log.msg.includes('Login failed')) return resolve()
        }))
      } catch (error) {
        reject(error)
      }
    })
  })

  it('should give an error when username is unknown', async () => {
    return new Promise((resolve, reject) => {
      try {
        const proc = cmd.createProcess(tools.getExecutable(), [
          'login',
          '--username',
          'superbaddassusernam@somerandomcorp.com',
          '--password',
          'secret'
        ])
        const messages = []
        proc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
          messages.push(data.msg)
        }))

        proc.on('exit', () => {
          assert.ok(messages.includes('Credentials invalid'))
          resolve()
        })
      } catch (error) {
        reject(error)
      }
    })
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

  it('should  be possible to login with correct credentials', (done) => {
    try {
      const messages = []
      const command = `${tools.getExecutable()} login --username ${tools.getUsername()} --password ${tools.getPassword()}`
      const proc = exec(command)
      proc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
        messages.push(data.msg)
      }))

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
      done()
    }
  })
})
