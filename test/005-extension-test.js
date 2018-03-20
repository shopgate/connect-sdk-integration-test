
const JSONStream = require('JSONStream')
const es = require('event-stream')
const fsEx = require('fs-extra')
const path = require('path')
const { assert, exec, tools, utils } = require('../utils')
const processExists = require('process-exists')

describe('Extension Action', function () {
  let backendProcessPid

  beforeEach(async () => {
    this.timeout(20000)
    await tools.setup()
    await tools.login()
    await tools.initApp()
    backendProcessPid = await tools.getBackendProcess()
  })

  afterEach(async () => {
    const existingPid = await processExists(backendProcessPid)
    if (existingPid) {
      try {
        process.kill(backendProcessPid, 'SIGINT')
      } catch(err) {
        console.log(err)
      }
    }

    await utils.processWasKilled(backendProcessPid)
    return tools.cleanup()
  })

  it('should create default structure on extension create and install frontend dependencies', function (done) {
    this.timeout(420000)
    const command = `${tools.getExecutable()} extension create frontend backend --extension @shopgateIntegrationTest/myAwesomExtension --trusted true`
    const proc = exec(command)
    const messages = []

    proc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
      console.log(data)
      messages.push(data.msg)
    }))

    proc.on('exit', (code) => {
      
      assert.ok(messages.includes('Downloading boilerplate ... done'), 'should have downloaded boilerplate')
      assert.ok(messages.includes('Updating backend files ... done'), 'should have updated backend files')
      assert.ok(messages.includes('Installing frontend depenencies ...'), 'should have installed frontend dependencies')
      assert.ok(messages.includes('Extension "@shopgateIntegrationTest/myAwesomExtension" created successfully'), 'should have logged the successful extension creation')
      done()
    })
  })

  it('should attach extensions and apply its config', function (done) {
    this.timeout(150000)
    const testExtensionFolder = path.join(tools.getProjectFolder(), 'extensions', 'testing-manual')
    const ex = async (done) => {
      await fsEx.mkdirp(testExtensionFolder, { mode: '777' })
      await fsEx.copy(path.join(tools.getRootDir(), 'test', 'fixtures', 'shopgate-cart'), testExtensionFolder)
      const command = `${tools.getExecutable()} extension attach`

      const proc = exec(command)
      const messages = []
      proc.stdout.on('data', data => {
        messages.push(JSON.parse(data).msg)
      })

      const appConfigJson = async () => (fsEx.readJson(path.join(tools.getProjectFolder(), 'extensions', 'testing-manual', 'extension', 'config.json')))

      proc.on('exit', async (code, signal) => {
        console.log(code)
        await (new Promise(resolve => (setTimeout(resolve, 500))))
        console.log(messages)
        assert.ok(messages.includes('Attached @shopgate/cart (testing-manual)'), 'should log attachment of extension')

        setTimeout(() => {
          appConfigJson().then(appConfig => {
            console.log(appConfig)
            assert.equal(appConfig.cakeUrl, 'extension_config_original', 'should overwrite the extensions config.json')
            done()
          })
        }, 5000)
      })
    }
    ex(done)
  })

  it('should detach extensions', function (done) {
    this.timeout(150000)
    const testExtensionFolder = path.join(tools.getProjectFolder(), 'extensions', 'testing-manual')
    const ex = async (done) => {
      await fsEx.mkdirp(testExtensionFolder)
      await fsEx.copy(path.join(tools.getRootDir(), 'test', 'fixtures', 'shopgate-cart'), testExtensionFolder)
      const command = `${tools.getExecutable()} extension attach`
      const proc = exec(command)
      const messages = []
      proc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
        messages.push(data.msg)
      }))

      proc.on('exit', async (code, signal) => {
        assert.ok(messages.includes('Attached @shopgate/cart (testing-manual)'), 'should log attachment of extension')

        const detProc = exec(`${tools.getExecutable()} extension detach testing-manual`)
        detProc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
          messages.push(data.msg)
        }))
        detProc.on('exit', () => {
          assert.ok(messages.includes('Detached @shopgate/cart'), 'should log detachment of extension')
          done()
        })
      })
    }
    ex(done)
  })
})
