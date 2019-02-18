const fsEx = require('fs-extra')
const got = require('got')
const path = require('path')
const utils = require('../lib/utils')
const pkg = require('../package.json')

describe('File Watchers', () => {
  const request = got.extend({
    baseUrl: 'http://localhost:8813',
    json: true,
    headers: {
      'user-agent': `${pkg.name}/${pkg.version}`
    }
  })

  beforeEach('Setup environment', async () => {
    await utils.setup()
    await utils.login()
    await utils.init()
    await utils.attachDefaultExtension()
  })

  afterEach('Cleanup environment', async () => {
    await utils.cleanup()
  })

  it('Detects when developer changes pipeline to an invalid one', async function () {
    this.retries(0)

    await request.post('/trustedPipelines/shopgateIntegrationTest.loginPipeline', { body: {} })

    const pipelineFilePath = path.join(
      utils.appDir, 'extensions',
      '@shopgateIntegrationTest-awesomeExtension', 'pipelines',
      'shopgateIntegrationTest.loginPipeline.json'
    )

    const pipelineFile = await fsEx.readJSON(pipelineFilePath)
    const { id: pipelineId, ...pipelineDefinition } = pipelineFile.pipeline
    await fsEx.writeJSON(pipelineFilePath, { ...pipelineFile, pipeline: pipelineDefinition })

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        utils.backendProcess.stderr.removeListener('data', dataHandler)
        reject(new Error('should have resolved already'))
      }, 15000)

      const dataHandler = (chunk) => {
        const log = chunk.toString()
        if (log.includes('Error while uploading pipeline')) {
          utils.backendProcess.stderr.removeListener('data', dataHandler)
          clearTimeout(timeout)
          resolve()
        }
      }

      utils.backendProcess.stderr.on('data', dataHandler)
    })

    await request.post('/trustedPipelines/shopgateIntegrationTest.loginPipeline', { body: {} })
    await fsEx.writeJSON(pipelineFilePath, { ...pipelineFile, id: pipelineId, pipeline: pipelineDefinition })
  })
})
