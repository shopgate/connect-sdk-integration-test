const assert = require('assert')
const got = require('got')
const utils = require('../lib/utils')
const pkg = require('../package.json')

describe('Unattached pipeline calls', () => {
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
    await utils.startBackend()
  })

  after('Cleanup environment', async () => {
    await utils.cleanup()
  })

  it('should send a pipeline request to the cli-proxy and receive a response', async () => {
    const { body } = await request.post('/pipelines/shopgate.catalog.getRootCategories.v1', { body: {} })
    assert.ok(body.categories)
  })

  it('should send an invalid pipeline request to the cli-proxy and receive an error', async () => {
    try {
      await request.post('/pipelines/shopgate.catalog.getRootCategories.v1', { json: false, body: 'someQuatsch' })
    } catch (error) {
      const body = JSON.parse(error.response.body)
      assert.strictEqual(body.error.message, 'Invalid pipelineRequest')
    }
  })

  it('should send a pipeline request to a non existing pipeline and receive an error', async () => {
    try {
      await request.post('/pipelines/nonExistingPL_v1', { body: {} })
    } catch (error) {
      const { body } = error.response
      assert.strictEqual(body.error.message, '/pipelines/nonExistingPL_v1 does not exist')
    }
  })

  it('should send a trusted pipeline request to and receive a response', async () => {
    const { body } = await request.post('/trustedPipelines/shopgate.user.getRegistrationUrl.v1', { body: {} })
    assert.deepStrictEqual(body, { url: '' })
  })
})
