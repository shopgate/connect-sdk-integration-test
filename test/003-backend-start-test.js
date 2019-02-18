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
    await utils.startBackend()
  })
})
