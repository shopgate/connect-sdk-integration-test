const { assert, tools, utils, exec } = require('../utils')
const request = require('request')
const path = require('path')
const fsEx = require('fs-extra')

describe('Attached pipeline calls', function () {
  let backendProcessPid

  beforeEach(async () => {
    this.timeout(10000)
    await tools.setup()
    await tools.login()
    await tools.initApp()
    backendProcessPid = await tools.attachDefaultExtension()
  })

  afterEach(async () => {
    try {
      process.kill(backendProcessPid, 'SIGINT')
    } catch (err) {
      console.log(err)
    }

    await utils.processWasKilled(backendProcessPid)
    return tools.cleanup()
  })

  it('should send a pipeline request and receive the response', (done) => {
    const ex = async (done) => {
      const options = {
        url: 'http://localhost:8813/trustedPipelines/shopgateIntegrationTest.awesomePipeline',
        json: {}
      }

      request.post(options, (err, res, body) => {
        assert.ifError(err)
        assert.ok(body.messages)
        done()
      })
    }
    ex(done)
  })

  it('should be possible to return a promise', function (done) {
    const ex = async (done) => {
      const options = {
        url: 'http://localhost:8813/trustedPipelines/shopgateIntegrationTest.promisePipeline',
        json: {}
      }

      request.post(options, (err, res, body) => {
        assert.ifError(err)
        assert.ok(body.messages)
        done()
      })
    }
    ex(done)
  })

  it('should throw an error on syntax error', function (done) {
    const ex = async (done) => {
      const options = {
        url: 'http://localhost:8813/trustedPipelines/shopgateIntegrationTest.errorPipeline',
        json: {}
      }

      request.post(options, (err, res, body) => {
        assert.ifError(err)
        assert.ok(body.error.message.includes('syntaxMüll'))
        assert.ok(body.error.code, 'EUNKNOWN')
        done()
      })
    }
    ex(done)
  })

  it('should throw an error on syntax error', function (done) {
    const ex = async (done) => {
      const options = {
        url: 'http://localhost:8813/trustedPipelines/shopgateIntegrationTest.noExportPipeline',
        json: {}
      }

      request.post(options, (err, res, body) => {
        assert.ifError(err)
        assert.ok(body.error.message.includes('Can\'t find step function'), 'Should report not finding a function')
        assert.ok(body.error.code, 'EUNKNOWN')
        done()
      })
    }
    ex(done)
  })

  it('should warn the developer if an invalid error was given', function (done) {
    const ex = async (done) => {
      const options = {
        url: 'http://localhost:8813/trustedPipelines/shopgateIntegrationTest.invalidErrorPipeline',
        json: {}
      }

      request.post(options, (err, res, body) => {
        assert.ifError(err)
        assert.ok(body.error.message.includes('The step returned a non valid error object as error'))
        assert.ok(body.error.code, 'EUNKNOWN')
        done()
      })
    }
    ex(done)
  })

  it('should warn the developer if a step file does not exist', function (done) {
    const ex = async (done) => {
      const options = {
        url: 'http://localhost:8813/trustedPipelines/shopgateIntegrationTest.stepNotFoundPipeline',
        json: {}
      }

      request.post(options, (err, res, body) => {
        assert.ifError(err)
        assert.ok(body.error.message.includes('doesNotExist.js not found'))
        assert.ok(body.error.code, 'EUNKNOWN')
        done()
      })
    }
    ex(done)
  })

  it('should catch uncaught errors and exit the process', function (done) {
    const ex = async (done) => {
      const options = {
        url: 'http://localhost:8813/trustedPipelines/shopgateIntegrationTest.throwingPipeline',
        json: {}
      }

      request.post(options, (err, res, body) => {
        assert.ifError(err)

        assert.ok(body.error.message.includes(`Baby, don't forget to catch me!`))
        assert.ok(body.error.code, 'EUNKNOWN')
        done()
      })
    }
    ex(done)
  })

  it('should catch errors with an errorCatching Step', function (done) {
    this.timeout(600000)
    const ex = async (done) => {
      const options = {
        url: 'http://localhost:8813/trustedPipelines/shopgateIntegrationTest.errorCatchingPipeline',
        json: {
          pipeline1Foo: 'bar'
        }
      }

      request.post(options, (err, res, body) => {
        assert.ifError(err)
        assert.deepEqual(body, { pipeline1Bar: 'extensionBar' })
        done()
      })
    }
    ex(done)
  })

  const userId = 'someUserId'
  const login = (cb) => {
    const readOptions = {
      url: 'http://localhost:8813/trustedPipelines/shopgateIntegrationTest.loginPipeline',
      json: {}
    }

    request.post(readOptions, (err, res, body) => {
      assert.ifError(err)
      assert.deepEqual(body, { success: true })
      const options = {
        url: 'http://localhost:8813/trustedPipelines/shopgateIntegrationTest.getUserIdPipeline',
        json: {}
      }

      request.post(options, (err, res, body) => {
        if (err) { assert.equal(userId, body.userId) }
        cb()
      })
    })
  }

  it('should login before accessing user storage', function (done) {
    login(async () => {
      const data = {
      }
      const options = {
        url: 'http://localhost:8813/trustedPipelines/shopgateIntegrationTest.getUserIdPipeline',
        json: data
      }

      request.post(options, (err, res, body) => {
        if (err) { assert.equal(userId, body.userId) }
        done()
      })
    })
  })

  it('should be possible to read from and write to storage', function (done) {
    login(async () => {
      const data = {
        device: 'deviceValue',
        extension: 'extensionValue',
        user: 'userValue'
      }
      const options = {
        url: 'http://localhost:8813/trustedPipelines/shopgateIntegrationTest.setStorageDataPipeline',
        json: data
      }

      request.post(options, (err, res, body) => {
        const readOptions = {
          url: 'http://localhost:8813/trustedPipelines/shopgateIntegrationTest.getStorageDataPipeline',
          json: {}
        }
        assert.ifError(err)
        request.post(readOptions, (err, res, body) => {
          if (err) { assert.deepEqual(body, data) }
          done()
        })
      })
    })
  })

  it('should be possible to delete from storage', function (done) {
    const ex = async (done) => {
      const options = {
        url: 'http://localhost:8813/trustedPipelines/shopgateIntegrationTest.deleteStorageDataPipeline',
        json: {}
      }

      request.post(options, (err, res, body) => {
        const readOptions = {
          url: 'http://localhost:8813/trustedPipelines/shopgateIntegrationTest.getStorageDataPipeline',
          json: {}
        }
        assert.ifError(err)
        request.post(readOptions, (err, res, body) => {
          if (err) console.log(err)
          assert.deepEqual(body, {
            device: 'empty',
            extension: 'empty',
            user: 'empty'
          })
          done()
        })
      })
    }
    login(() => (ex(done)))
  })

  it('should give app and device info', function (done) {
    const options = {
      url: 'http://localhost:8813/trustedPipelines/shopgateIntegrationTest.getDcDataPipeline',
      json: {}
    }
    request.post(options, (err, res, body) => {
      assert.ifError(err)

      assert.ok(body.appInfo.app.appVersion)
      assert.ok(body.deviceInfo.app.os.platform)
      done()
    })
  })
})
