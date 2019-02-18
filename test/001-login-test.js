const assert = require('assert')
const utils = require('../lib/utils')

describe('Login', () => {
  beforeEach('Setup environment', async () => {
    await utils.setup()
  })

  afterEach('Cleanup environment', async () => {
    await utils.cleanup()
  })

  it('should give an error when no credentials were entered', async () => {
    return utils.runner
      .run(`${utils.executable} login --username --password`)
      .stderr(/Login failed/)
      .end()
  })

  it('should give an error when username is unknown', async () => {
    return utils.runner
      .run(`${utils.executable} login --username superbaddassusernam@somerandomcorp.com --password secret`)
      .stderr(/Credentials invalid/)
      .end()
  })

  it('should give an error when password is wrong', async () => {
    return utils.runner
      .run(`${utils.executable} login --username ${utils.username} --password foobarbaz1`)
      .stderr(/Credentials invalid/)
      .end()
  })

  it('should be possible to login with correct credentials', async () => {
    await utils.runner
      .run(`${utils.executable} login --username ${utils.username} --password ${utils.password}`)
      .stdout(/Login successful/)
      .end()

    const sessionData = await utils.getSession()
    assert.ok(sessionData.token)
  })
})
