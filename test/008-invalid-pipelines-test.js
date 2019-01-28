
const JSONStream = require('JSONStream')
const es = require('event-stream')
const fsEx = require('fs-extra')
const path = require('path')
const { assert, exec, tools, utils } = require('../utils')

describe('Invalid Pipeline', function () {
  beforeEach(async () => {
    await tools.setup()
    await tools.login()
    await tools.initApp()
  })

  afterEach(async () => {
    await tools.cleanup()
  })

  it('should throw an error, if an invalid pipeline is within the extension to be attached', async () => {
    const extensionFolder = '@shopgateIntegrationTest-invalidExtension'
    const testExtensionFolder = path.join(tools.getAppDirectory(), 'extensions', extensionFolder)
    await fsEx.mkdirp(testExtensionFolder)
    await fsEx.copy(tools.getFixtureExtensionPath(extensionFolder), testExtensionFolder)
    const command = `${tools.getExecutable()} extension attach ${extensionFolder}`
    const proc = exec(command)
    const messages = []
    const errors = []
    proc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
      messages.push(data.msg)
    }))
    proc.stderr.pipe(JSONStream.parse()).pipe(es.map(data => {
      errors.push(data.msg)
    }))

    return new Promise((resolve, reject) => {
      proc.on('exit', (code) => {
        assert.ok(!code, 'Should be success')
        const backend = exec(`${tools.getExecutable()} backend start`)
        backend.stdout.pipe(JSONStream.parse()).pipe(es.map(async data => {
          messages.push(data.msg)
          try {
            if (data.msg.startsWith('{"errors"')) {
              const errMessages = (JSON.parse(data.msg).errors)
              const pid = data.pid
              assert.equal(errMessages[0].field, 'pipeline shopgateIntegrationTest.invalidPipeline')
              assert.equal(errMessages[0].code, 'PIPELINEINVALID')
              process.kill(pid, 'SIGINT')
              await utils.processWasKilled(pid)
              resolve()
            }
          } catch (err) {
            reject(err)
          }
        }))
      })
    })
  })
})
