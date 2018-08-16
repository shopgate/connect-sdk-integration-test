const { assert, tools, utils } = require('../utils')
const Backend = require('../utils/backend')
const request = require('request')
const processExists = require('process-exists')

describe('Unattached pipeline calls', function () {
  let proc
  beforeEach(async () => {
    await tools.setup()
    await tools.login()
    await tools.initApp()
    proc = new Backend()
    await proc.start()
  })

  afterEach(async () => {
    await proc.kill()
    return tools.cleanup()
  })

  it('should send a pipeline request to the cli-proxy and receive a response', function (done) {
    const options = {
      url: 'http://localhost:8813/pipelines/shopgate.catalog.getRootCategories.v1',
      json: {}
    }

    request.post(options, (err, res, body) => {
      assert.ifError(err)
      assert.ok(body.categories)
      done()
    })
  })

  it('should send an invalid pipeline request to the cli-proxy and receive an error', (done) => {
    const options = {
      url: 'http://localhost:8813/pipelines/shopgate.catalog.getRootCategories.v1',
      data: 'someQuatsch'
    }

    request.post(options, (err, res, body) => {
      assert.ifError(err)
      body = JSON.parse(body)
      assert.equal(body.error.message, 'Invalid pipelineRequest')
      done()
    })
  })

  it('should send a pipeline request to a non existing pipeline and receive an error', (done) => {
    const options = {
      url: 'http://localhost:8813/pipelines/nonExistingPL_v1',
      json: {}
    }

    request.post(options, (err, res, body) => {
      assert.ifError(err)
      assert.equal(body.error.message, '/pipelines/nonExistingPL_v1 does not exist')
      done()
    })
  })

  it('should send a trusted pipeline request to and receive a response', (done) => {
    const options = {
      url: 'http://localhost:8813/trustedPipelines/shopgate.user.getRegistrationUrl.v1',
      json: {}
    }

    request.post(options, (err, res, body) => {
      assert.ifError(err)
      assert.deepEqual(body, { url: '' })
      done()
    })
  })
})
