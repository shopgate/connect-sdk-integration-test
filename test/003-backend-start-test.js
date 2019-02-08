const utils = require('../lib/utils')

describe('Backend start', () => {
  beforeEach('Setup environment', async () => {
    await utils.setup()
    await utils.login()
    await utils.init()
  })

  afterEach('Cleanup environment', async () => {
    await utils.cleanup()
  })

  it('should be possible to start the backend', async () => {
    const backendProcess = await utils.startBackend()
    await new Promise((resolve) => {
      setImmediate(() => {
        backendProcess.kill('SIGINT')
        resolve()
      })
    })
  })
})
