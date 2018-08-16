const { assert, tools, utils, exec } = require('../utils')
const request = require('request')
const JSONStream = require('JSONStream')
const es = require('event-stream')
const path = require('path')
const fsEx = require('fs-extra')
const Backend = require('../utils/backend')

describe.only('File Watchers', function () {
  let proc

  beforeEach(async () => {
    await tools.setup()
    await tools.login()
    await tools.initApp()
    await tools.attachDefaultExtension()
    proc = new Backend()
    await proc.start()
  })

  afterEach(async () => {
    proc.kill()
    await tools.detachAll()
    await tools.cleanup()
  })

  it('Detects when developer changes pipeline to an invalid one', async () => {
    let invalidPipelineDetected = false
    proc.instance.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
      if (data.msg.includes(`Pipeline invalid`)) {
        invalidPipelineDetected = true
      }
    }))

    const options = {
      url: 'http://localhost:8813/trustedPipelines/shopgateIntegrationTest.loginPipeline',
      json: {}
    }

    const pipelineFile = path.join(
      tools.getProjectFolder(), 'extensions',
      '@shopgateIntegrationTest-awesomeExtension', 'pipelines',
      'shopgateIntegrationTest.loginPipeline.json')

    return new Promise((resolve, reject) => {
      request.post(options, (err, res, body) => {
        if (err) return reject(err)
        fsEx.readJson(pipelineFile).then(async (json) => {
          const input = json.pipeline.input
          delete json.pipeline.input
          try {
            await fsEx.writeJson(pipelineFile, json)
            await new Promise(resolve => setTimeout(resolve, 4000))
            assert.ok(invalidPipelineDetected, 'Should have detected invalid pipeline')
            request.post(options, (err, res, body) => {
              if (err) return reject(err)
              json.pipeline.input = input
              fsEx.writeJSON(pipelineFile, json).then((new Promise(resolve => setTimeout(resolve, 5000)))).then(resolve)
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

  it('does not try to upload a pipeline file, if extension is detached', async () => {
    let invalidPipelineDetected = false
    let loggedSkipping = false
    const logs = []
    proc.instance.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
      if (data.msg && data.msg.includes(`Error while uploading pipeline`)) {
        invalidPipelineDetected = true
      }

      if (data.msg && data.msg.includes(`The extension of the pipeline is not attached --> skip`)) {
        loggedSkipping = true
      }

      logs.push(data.msg)
    }))

    return new Promise((resolve, reject) => {
      const proc = exec(`${tools.getExecutable()} extension detach`)
      proc.stdout.on('data', data => console.log(data.toString()))
      proc.on('exit', async () => {
        const pipelineFile = path.join(
          tools.getProjectFolder(), 'extensions',
          '@shopgateIntegrationTest-awesomeExtension', 'pipelines',
          'shopgateIntegrationTest.loginPipeline.json')

        const original = await fsEx.readJson(pipelineFile)
        const input = original.pipeline.input
        delete original.pipeline.input
        await fsEx.writeJson(pipelineFile, original)
        await new Promise(resolve => setTimeout(resolve, 1000))
        let int
        let counter = 0
        try {
          const check = () => {
            return new Promise((resolve, reject) => {
              int = setInterval(() => {
                counter++
                if (loggedSkipping) resolve()
                if (!loggedSkipping && counter >= 60) reject(new Error('timeout'))
                if (logs.includes('SDK connection closed')) reject(new Error('SDK connection closed'))
              }, 1000)
            })
          }
          await check()
          clearInterval(int)

          try {
            const attached = await fsEx.readJson(path.join(tools.getProjectFolder(), '.sgcloud', 'attachedExtensions.json'))
            await assert.deepEqual({ attachedExtensions: {} }, attached)
            await assert.ok(loggedSkipping)
            await assert.ok(!invalidPipelineDetected)
            original.pipeline.input = input
            await fsEx.writeJson(pipelineFile, original)
            resolve()
          } catch (err) {
            reject(err)
          }
        } catch (error) {
          clearInterval(int)
          reject(error)
        }
      })
    })
  })
})
