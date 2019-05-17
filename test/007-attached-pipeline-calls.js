const assert = require('assert')
const got = require('got')
const utils = require('../lib/utils')
const pkg = require('../package.json')

describe('Attached pipeline calls', () => {
  const request = got.extend({
    baseUrl: 'http://localhost:8813',
    json: true,
    headers: {
      'user-agent': `${pkg.name}/${pkg.version}`
    }
  })

  before('Setup environment', async () => {
    await utils.setup()
    await utils.login()
    await utils.init()
    await utils.attachDefaultExtension()
  })

  beforeEach(async () => {
    await utils.startBackend()
  })

  after('Cleanup environment', async () => {
    await utils.cleanup()
  })

  it('should send a pipeline request and receive the response', async () => {
    const { body } = await request.post('/trustedPipelines/shopgateIntegrationTest.awesomePipeline', { body: {} })
    assert.ok(body.messages)
  })

  it('should be possible to return a promise', async () => {
    const { body } = await request.post('/trustedPipelines/shopgateIntegrationTest.promisePipeline', { body: {} })
    assert.ok(body.messages)
  })

  it('should throw an error on syntax error', async () => {
    try {
      await request.post('/trustedPipelines/shopgateIntegrationTest.errorPipeline', { body: {} })
    } catch (error) {
      const { body } = error.response
      assert.ok(body.error.message.includes('syntaxMüll'))
      assert.ok(body.error.code, 'EUNKNOWN')
    }
  })

  it('should throw an error if step function was not exported', async () => {
    try {
      await request.post('/trustedPipelines/shopgateIntegrationTest.noExportPipeline', { body: {} })
    } catch (error) {
      const { body } = error.response
      assert.ok(body.error.message.includes('Cannot find step function'), 'Should report not finding a function')
      assert.ok(body.error.code, 'EUNKNOWN')
    }
  })

  it('should warn the developer if an invalid error was given', async () => {
    try {
      await request.post('/trustedPipelines/shopgateIntegrationTest.invalidErrorPipeline', { body: {} })
    } catch (error) {
      const { body } = error.response
      assert.ok(body.error.message.includes('The step returned an invalid error object as error'))
      assert.ok(body.error.code, 'EUNKNOWN')
    }
  })

  it('should warn the developer if a step file does not exist', async () => {
    try {
      await request.post('/trustedPipelines/shopgateIntegrationTest.stepNotFoundPipeline', { body: {} })
    } catch (error) {
      const { body } = error.response
      assert.ok(body.error.message.includes('doesNotExist.js not found'))
      assert.ok(body.error.code, 'EUNKNOWN')
    }
  })

  it('should catch uncaught errors and exit the process', async () => {
    try {
      await request.post('/trustedPipelines/shopgateIntegrationTest.throwingPipeline', { body: {} })
    } catch (error) {
      const { body } = error.response
      assert.ok(body.error.message.includes(`Baby, don't forget to catch me!`))
      assert.ok(body.error.code, 'EUNKNOWN')
    }
  })

  it('should catch errors with an errorCatching Step', async () => {
    const { body } = await request.post('/trustedPipelines/shopgateIntegrationTest.errorCatchingPipeline', { body: { pipeline1Foo: 'bar' } })
    assert.deepStrictEqual(body, { pipeline1Bar: 'extensionBar' })
  })

  const userId = 'someUserId'
  const login = async () => {
    const { body } = await request.post('/trustedPipelines/shopgateIntegrationTest.loginPipeline', { body: {} })
    assert.deepStrictEqual(body, { success: true })

    try {
      await request.post('/trustedPipelines/shopgateIntegrationTest.getUserIdPipeline', { body: {} })
    } catch (error) {
      const { body } = error.response
      assert.strictEqual(userId, body.userId)
    }
  }

  it('should login before accessing user storage', async () => {
    await login()
    try {
      await request.post('/trustedPipelines/shopgateIntegrationTest.getUserIdPipeline', { body: {} })
    } catch (error) {
      const { body } = error.response
      assert.strictEqual(userId, body.userId)
    }
  })

  it('should be possible to read from and write to storage', async () => {
    const data = {
      device: 'deviceValue',
      extension: 'extensionValue',
      user: 'userValue'
    }

    await login()
    await request.post('/trustedPipelines/shopgateIntegrationTest.setStorageDataPipeline', { body: data })

    try {
      await request.post('/trustedPipelines/shopgateIntegrationTest.getStorageDataPipeline', { body: {} })
    } catch (error) {
      const { body } = error.response
      assert.deepStrictEqual(body, data)
    }
  })

  it('should be possible to delete from storage', async () => {
    await login()
    await request.post('/trustedPipelines/shopgateIntegrationTest.deleteStorageDataPipeline', { body: {} })

    try {
      await request.post('/trustedPipelines/shopgateIntegrationTest.getStorageDataPipeline', { body: {} })
    } catch (error) {
      const { body } = error.response
      assert.deepStrictEqual(body, {
        device: 'empty',
        extension: 'empty',
        user: 'empty'
      })
    }
  })

  it('should give app and device info', async () => {
    const { body } = await request.post('/trustedPipelines/shopgateIntegrationTest.getDcDataPipeline', { body: {} })
    assert.ok(body.appInfo.app.appVersion)
    assert.ok(body.deviceInfo.app.os.platform)
  })
})
