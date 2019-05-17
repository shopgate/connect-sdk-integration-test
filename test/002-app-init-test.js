const assert = require('assert')
const fsEx = require('fs-extra')
const path = require('path')
const utils = require('../lib/utils')

describe('App init', () => {
  beforeEach('Setup environment', async () => {
    await utils.setup()
    await utils.login()
  })

  afterEach('Cleanup environment', async () => {
    await utils.cleanup()
  })

  it('should throw an error if not logged in', async () => {
    await utils.logout()
    return utils.runner
      .run(`${utils.executable} init --appId ${utils.appId}`)
      .stderr(/You're not logged in. Please run `sgconnect login` again\./)
      .end()
  })

  it('should create all subdirectories in the application directory', async () => {
    await utils.runner
      .run(`${utils.executable} init --appId ${utils.appId}`)
      .stdout(new RegExp(`The Application "${utils.appId}" was successfully initialized`))
      .end()

    const appDirectories = await fsEx.readdir(utils.appDir)
    assert.deepStrictEqual(appDirectories.sort(), [
      '.sgcloud',
      'extensions',
      'pipelines',
      'themes',
      'trustedPipelines'
    ])
  })

  it('should ask to reinit the folder if application folder already initialized', async () => {
    await utils.init()

    await utils.runner
      .run(`${utils.executable} init --appId ${utils.appId}`)
      .on(new RegExp(`Do you really want to overwrite your current application (${utils.appId})?`)).respond('Y\n')
      .end()
  })

  it('should not remove any files when user aborts the reinit', async () => {
    await utils.init()

    const hash = await utils.getDirectoryHash()

    await utils.runner
      .run(`${utils.executable} init --appId shop_123`)
      .on(new RegExp(`Do you really want to overwrite your current application (${utils.appId})?`)).respond('N\n')
      .end()

    const appData = await fsEx.readJson(path.join(utils.appDir, '.sgcloud', 'app.json'))
    assert.strictEqual(appData.id, utils.appId)
    assert.deepStrictEqual(hash, await utils.getDirectoryHash())
  })

  it('should throw an error, if the application was not found', async () => {
    await utils.runner
      .run(`${utils.executable} init --appId non_existing_shop`)
      .stderr(/Application non_existing_shop does not exist/)
      .end()
  })
})
