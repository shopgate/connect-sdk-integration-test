const {assert, tools, utils} = require('../utils')
const request = require('request')

describe('Unattached pipeline calls', function () {
  let backendProcess

  beforeEach(async function () {
    this.timeout(10000)
    await tools.setup()
    backendProcess = await tools.getBackendProcess()
  })

  afterEach(async () => {
    backendProcess.kill()
    await utils.processWasKilled(backendProcess.pid)
    return tools.cleanup()
  })

  it.skip('should send a pipeline request to the cli-proxy and receive a response', (done) => {
    const options = {
      json: true,
      url: 'http://localhost:8090/pipelines/getRootCategories_v1',
      data: {}
    }

    request.post(options, (err, res, body) => {
      assert.ifError(err)
      assert.ok(body)
      done()
    })
  })
})
