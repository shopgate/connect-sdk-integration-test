const JSONStream = require('JSONStream')
const { lstatSync, readdir } = require('fs')
const es = require('event-stream')
const path = require('path')
const fsEx = require('fs-extra')
const { assert, exec, tools } = require('../utils')

describe('App init', () => {
  beforeEach(async () => {
    await tools.setup()
    await tools.login()
  })

  afterEach(async () => {
    return tools.cleanup()
  })

  it('should throw an error if not logged in', function (done) {
    tools.logout().then(() => {
      try {
        const command = `${tools.getExecutable()} init --appId ${tools.getAppId()}`
        const proc = exec(command)
        const messages = []
        proc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
          messages.push(data.msg)
        }))

        proc.on('exit', (code) => {
          assert.equal(code, 1)
          assert.ok(messages.includes('You\'re not logged in! Please run `sgcloud login` again.'))
          done()
        })

        proc.stderr.on('data', (err) => {
          assert.ifError(err)
          done()
        })
      } catch (err) {
        assert.fail(err)
        done()
      }
    })
  })
  it('should create all subfolders in the application directory', function (done) {
    
    try {
      const command = `${tools.getExecutable()} init --appId ${tools.getAppId()}`
      const proc = exec(command)
      const messages = []
      proc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
        console.log(data)
        messages.push(data.msg)
      }))

      proc.on('exit', (code) => {
        console.log('exit')
        assert.ok(messages.includes(`The Application "${tools.getAppId()}" was successfully initialized`))

        readdir(tools.getProjectFolder(), (err, dirs) => {
          if (err) return assert.ifError(err)

          dirs.map(name => path.join(tools.getProjectFolder(), name))
            .filter(async source => (lstatSync(source).isDirectory()))
            .map(name => name.replace(path.join(tools.getProjectFolder(), '/'), ''))

          const checks = ['.sgcloud', 'themes', 'extensions', 'pipelines', 'trustedPipelines']

          if (!dirs.length) assert.fail('no directories found')
          checks.forEach(check => assert.ok(dirs.includes(check), '.sgloud exists'))
          done()
        })
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

  it('should ask to reinit the folder if application folder already initialized', function (done) {
    tools.initApp(tools.getAppId()).then(() => {
      try {
        const command = `${tools.getExecutable()} init --appId ${tools.getAppId()}`
        const proc = exec(command)
        let asked = false
        proc.stdout.on('data', (data) => {
          if (data.includes('y/N')) {
            asked = true
            proc.stdin.write('y\n')
          }
        })

        proc.on('exit', async (code) => {
          const app = await fsEx.readJson(path.join(tools.getProjectFolder(), '.sgcloud', 'app.json'))
          assert.ok(asked, 'Asked if reinit should be done')
          assert.equal(app.id, tools.getAppId())
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

  it.only('should not remove any files when user aborts the reinit', function (done) {
    tools.initApp(tools.getAppId()).then(async () => {
      try {
        const hash = await tools.getDirectoryHash()
        const command = `${tools.getExecutable()} init --appId shop_123`
        const proc = exec(command)
        let asked = false
        proc.stdout.on('data', (data) => {
          console.log(data)
          if (data.includes('y/N')) {
            asked = true
            proc.stdin.write('N\n')
          }
        })

        proc.on('exit', async (code) => {
          console.log('exit')
          const app = await fsEx.readJson(path.join(tools.getProjectFolder(), '.sgcloud', 'app.json'))
          assert.ok(asked, 'Asked if reinit should be done')
          assert.deepEqual(hash, await tools.getDirectoryHash())
          assert.equal(app.id, tools.getAppId())
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

  it('should throw an error, if the application was not found', function (done) {
    try {
      const command = `${tools.getExecutable()} init --appId shop_not_Existing`
      const proc = exec(command)

      const messages = []
      proc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
        messages.push(data.msg)
      }))

      proc.on('exit', async (code) => {
        assert.equal(code, 1)
        assert.ok(messages.includes('Application shop_not_Existing not found'))
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
