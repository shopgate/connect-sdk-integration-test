const { assert, tools, utils } = require('../utils')
const request = require('request')
const JSONStream = require('JSONStream')
const es = require('event-stream')
const path = require('path')
const fsEx = require('fs-extra')
const processExists = require('process-exists')

describe('File Watchers', function () {
  this.retries(2)

  let backendProcessPid

  beforeEach(async () => {
    await tools.setup()
    await tools.login()
    await tools.initApp()
    backendProcessPid = await tools.attachDefaultExtension()
  })

  afterEach(async () => {
    if (await processExists(backendProcessPid)) {
      try {
        process.kill(backendProcessPid, 'SIGINT')
      } catch (err) {
      }

      await utils.processWasKilled(backendProcessPid)
      backendProcessPid = null
    }
    return tools.cleanup()
  })

  it('Detects when developer changes pipeline to an invalid one', async () => {
    let invalidPipelineDetected = false
    tools.currentBackendProcess.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
      if (data.msg.includes(`Error while uploading pipeline`)) {
        invalidPipelineDetected = true
      }
    }))

    const options = {
      url: 'http://localhost:8813/trustedPipelines/shopgateIntegrationTest.loginPipeline',
      json: {}
    }

    const pipelineFile = path.join(
      tools.getAppDirectory(), 'extensions',
      '@shopgateIntegrationTest-awesomeExtension', 'pipelines',
      'shopgateIntegrationTest.loginPipeline.json')

    return new Promise((resolve, reject) => {
      request.post(options, (err, res, body) => {
        if (err) return reject(err)
        fsEx.readJson(pipelineFile).then(async (json) => {
          const pipelineId = json.pipeline.id
          delete json.pipeline.id
          try {
            await fsEx.writeJson(pipelineFile, json)
            await new Promise(resolve => setTimeout(resolve, 4000))
            assert.ok(invalidPipelineDetected, 'Should have detected invalid pipeline')
            request.post(options, (err, res, body) => {
              if (err) return reject(err)
              json.pipeline.id = pipelineId
              fsEx.writeJSON(pipelineFile, json).then(resolve)
            })
          } catch (err) {
            reject(err)
          }
        }).catch(err => {
          reject(err)
        })
      })
    })
  })

  // This case tests an unintended behavior. Extensions should be attached/detached while the backend is not running.
  // After some investigation the problem seems to be with the chokidar (file watcher).
  // It looks like it fires the 'change' event when a file is still being written.
  // it('does not try to upload a pipeline file, if extension is detached')
})
