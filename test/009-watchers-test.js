const { assert, tools, utils, exec } = require('../utils')
const request = require('request')
const JSONStream = require('JSONStream')
const es = require('event-stream')
const path = require('path')
const fsEx = require('fs-extra')
const processExists = require('process-exists')

describe('File Watchers', function () {
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

      const json = await fsEx.readJson(pipelineFile)
      const pipelineId = json.pipeline.id
      delete json.pipeline.id
      await fsEx.writeJson(pipelineFile, json)

      try {
        await new Promise(resolve => setTimeout(resolve, 4000))
        assert.ok(invalidPipelineDetected, 'Should have detected invalid pipeline')
      } catch (err) {
        assert.ifError(err)
        done()
      }

      try {
        const stat = await fsEx.lstat(pipelineFile)
        assert.fail(stat)
      } catch (err) {
        assert.ok(err)
      }

      request.post(options, async (err, res, body) => {
        assert.ok(body.success)
        json.pipeline.id = pipelineId
        await fsEx.writeJson(pipelineFile, json)
        done()
      })
    })
  })

  it('does not try to upload a pipeline file, if extension is detached', (done) => {
    let invalidPipelineDetected = false
    let loggedSkipping = false
    const logs = []
    tools.currentBackendProcess.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
      if (data.msg && data.msg.includes(`Error while uploading pipeline`)) {
        invalidPipelineDetected = true
      }

      if (data.msg && data.msg.includes(`The extension of the pipeline is not attached --> skip`)) {
        loggedSkipping = true
      }

      logs.push(data.msg)
    }))
    const proc = exec(`${tools.getExecutable()} extension detach @shopgateIntegrationTest-awesomeExtension`)

    proc.on('exit', async () => {
      const pipelineFile = path.join(
        tools.getProjectFolder(), 'extensions',
        '@shopgateIntegrationTest-awesomeExtension', 'pipelines',
        'shopgateIntegrationTest.loginPipeline.json')

      await fsEx.writeJson(pipelineFile, {})

      try {
        let counter = 0
        await new Promise((resolve, reject) => {
          const int = setInterval(() => {
            counter++
            if (loggedSkipping) clearInterval(int) && resolve()
            if (!loggedSkipping && counter >= 20) clearInterval(int) && reject(new Error('timeout'))
          }, 1000)
        })

        const attached = await fsEx.readJson(path.join(tools.getProjectFolder(), '.sgcloud', 'attachedExtensions.json'))
        assert.deepEqual({ attachedExtensions: {} }, attached)
        assert.ok(loggedSkipping)
        assert.ok(!invalidPipelineDetected)
        done()
      } catch (error) {
        console.log(logs)
        assert.ifError(error)
        done()
      }
    })
  })
})
