const { assert, tools, utils, exec } = require('../utils')
const request = require('request')
const JSONStream = require('JSONStream')
const es = require('event-stream')
const path = require('path')
const fsEx = require('fs-extra')
const processExists = require('process-exists')

describe('Watchers', function () {
  let backendProcessPid

  beforeEach(async () => {
    this.timeout(10000)
    await tools.setup()
    await tools.login()
    await tools.initApp()
    backendProcessPid = await tools.attachDefaultExtension()
  })

  afterEach(async () => {
    if (await processExists(backendProcessPid)) {
      try {
        process.kill(backendProcessPid, 'SIGINT')
      } catch(err) {
        console.log(err)
      }

      await utils.processWasKilled(backendProcessPid)
      backendProcessPid = null
    }
    return tools.cleanup()
  })

  it('Detects when developer changes pipeline to an invalid one', (done) => {
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

    request.post(options, async (err, res, body) => {
      assert.ifError(err)

      const pipelineFile = path.join(
        tools.getProjectFolder(), 'extensions',
        '@shopgateIntegrationTest-awesomeExtension', 'pipelines',
        'shopgateIntegrationTest.loginPipeline.json')
      const json = fsEx.readJson(pipelineFile)

      json.output = []

      await fsEx.writeJson(pipelineFile, json)

      await new Promise((resolve, reject) => setTimeout(() => {
        invalidPipelineDetected ? setTimeout(resolve, 500) : reject('Invalid Pipeline was not detected')
      }, 2000))

      try {
        const stat = await fsEx.lstat(pipelineFile)
        assert.fail(stat)
      } catch (err) {
        assert.ok(err)
      }

      request.post(options, async (err, res, body) => {
        assert.ok(body.success)
        done()
      })
    })
  })

  it('does not try to upload a pipeline file, if extension is detached', (done) => {
    let invalidPipelineDetected = false
    let loggedSkipping = false
    tools.currentBackendProcess.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
      if (data.msg.includes(`Error while uploading pipeline`)) {
        invalidPipelineDetected = true
      }

      if (data.msg.includes(`The extension of the pipeline is not attached --> skip`)) {
        loggedSkipping = true
      }
    }))
    const proc = exec(`${tools.getExecutable()} extension detach @shopgateIntegrationTest-awesomeExtension`)
    proc.on('exit', async () => {
      const pipelineFile = path.join(
        tools.getProjectFolder(), 'extensions',
        '@shopgateIntegrationTest-awesomeExtension', 'pipelines',
        'shopgateIntegrationTest.loginPipeline.json')

      await fsEx.writeJson(pipelineFile, {})

      try {
        await new Promise((resolve, reject) => setTimeout(() => {
          loggedSkipping && invalidPipelineDetected ? reject(new Error('Invalid Pipeline detected')) : resolve('Invalid Pipeline was not detected')
        }, 2000))

        done()
      } catch (error) {
        assert.ifError(error)
        done()
      }
    })
  })
})
