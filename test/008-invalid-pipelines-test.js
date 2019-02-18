const JSONStream = require('JSONStream')
const assert = require('assert')
const { spawn } = require('child_process')
const es = require('event-stream')
const fsEx = require('fs-extra')
const path = require('path')
const utils = require('../lib/utils')

describe('Invalid Pipeline', () => {
  beforeEach('Setup environment', async () => {
    await utils.setup()
    await utils.login()
    await utils.init()
  })

  afterEach('Cleanup environment', async () => {
    await utils.cleanup()
  })

  it('should throw an error, if an invalid pipeline is within the extension to be attached', async () => {
    const extensionDir = '@shopgateIntegrationTest-invalidExtension'
    const extensionDirPath = path.join(utils.appDir, 'extensions', extensionDir)
    await fsEx.mkdirp(extensionDir, { mode: '777' })
    await fsEx.copy(path.resolve(__dirname, 'fixtures', '@shopgateIntegrationTest-invalidExtension'), extensionDirPath)
    await utils.runner
      .run(`${utils.executable} extension attach ${extensionDir}`)
      .code(0)
      .end()

    const proc = spawn(utils.executable, ['backend', 'start'], {
      cwd: utils.workingDir,
      env: { ...utils.env, 'INTEGRATION_TEST': true }
    })
    const jsonParser = JSONStream.parse()

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('should have been finished till now'))
      }, 60000)

      proc.stdout.pipe(jsonParser).pipe(es.map(async data => {
        if (data.msg.startsWith('{"errors"')) {
          const errMessages = (JSON.parse(data.msg).errors)
          assert.equal(errMessages[0].field, 'pipeline shopgateIntegrationTest.invalidPipeline')
          assert.equal(errMessages[0].code, 'PIPELINEINVALID')
          proc.kill('SIGINT')
        }
      }))

      proc.on('close', () => {
        clearTimeout(timeout)
        proc.stdout.unpipe(jsonParser)
        resolve()
      })

      proc.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
    })
  })
})
