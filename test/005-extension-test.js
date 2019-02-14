const assert = require('assert')
const { spawn } = require('child_process')
const fsEx = require('fs-extra')
const path = require('path')
const utils = require('../lib/utils')
const config = require('../config')

describe('Extension action', () => {
  beforeEach('Setup environment', async () => {
    await utils.setup()
    await utils.login()
    await utils.init()
  })

  afterEach('Cleanup environment', async () => {
    await utils.cleanup()
  })

  it('should create default structure on extension create and install frontend dependencies', async () => {
    const proc = spawn(utils.executable, [
      'extension', 'create',
      'frontend', 'backend',
      '--extension', '@shopgateIntegrationTest/myAwesomeExtension',
      '--trusted', 'true'
    ], {
      cwd: utils.workingDir,
      env: { ...utils.env, INTEGRATION_TEST: 'true' }
    })

    const messages = await new Promise((resolve, reject) => {
      const stdout = []
      proc.stdout.on('data', (chunk) => {
        try {
          const log = JSON.parse(chunk.toString())
          stdout.push(log.msg)
        } catch (err) {
          console.warn(err)
          stdout.push(chunk.toString())
        }
      })
      proc.on('close', () => resolve(stdout))
      proc.on('error', reject)
    })

    assert.ok(messages.includes('Downloading boilerplate ... done'), 'should have downloaded boilerplate')
    assert.ok(messages.includes('Updating backend files ... done'), 'should have updated backend files')
    assert.ok(messages.includes('Installing frontend depenencies ...'), 'should have installed frontend dependencies')
    assert.ok(messages.includes('Extension "@shopgateIntegrationTest/myAwesomeExtension" created successfully'), 'should have logged the successful extension creation')
    assert.ok(messages.includes('Attached @shopgateIntegrationTest/myAwesomeExtension (@shopgateIntegrationTest-myAwesomeExtension)'), 'should have logged the extension attachment')
  })

  it('should attach extensions and apply its config', async () => {
    const backendProcess = await utils.startBackend()
    const restarting = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        backendProcess.stdout.removeAllListeners('data')
        reject(new Error('Backend did not restart'))
      }, 4000)
      backendProcess.stdout.on('data', (chunk) => {
        if (chunk.toString().includes('Extension file was changed, restarting')) {
          clearTimeout(timeout)
          resolve()
        }
      })
    })

    const extensionDir = path.join(utils.appDir, 'extensions', 'testing-manual')
    await fsEx.mkdirp(extensionDir, { mode: '777' })
    await fsEx.copy(path.resolve(__dirname, 'fixtures', 'shopgate-cart'), extensionDir)

    await utils.runner
      .env('INTEGRATION_TEST', 'true')
      .expect((result) => {
        const log = JSON.parse(result.stdout)
        if (!log.msg === 'Attached @shopgate/cart (testing-manual)') {
          return new Error('should log attachment of extension')
        }
      })
      .run(`${utils.executable} extension attach`)
      .end()

    await restarting

    const appConfig = await fsEx.readJson(path.join(extensionDir, 'extension', 'config.json'))
    assert.strictEqual(appConfig.cakeUrl, 'extension_config_original', 'should overwrite the extensions config.json')
  })

  it('should detach extensions', async () => {
    const extensionDir = path.join(utils.appDir, 'extensions', 'testing-manual')
    await fsEx.mkdirp(extensionDir, { mode: '777' })
    await fsEx.copy(path.resolve(__dirname, 'fixtures', 'shopgate-cart'), extensionDir)

    await utils.runner
      .env('INTEGRATION_TEST', 'true')
      .expect((result) => {
        const log = JSON.parse(result.stdout)
        if (!log.msg === 'Attached @shopgate/cart (testing-manual)') {
          return new Error('should log attachment of extension')
        }
      })
      .run(`${utils.executable} extension attach`)
      .end()

    await new Promise(setImmediate)

    await utils.runner
      .env('INTEGRATION_TEST', 'true')
      .expect((result) => {
        const log = JSON.parse(result.stdout)
        if (!log.msg === 'Detached @shopgate/cart') {
          return new Error('should log detachment of extension')
        }
      })
      .run(`${utils.executable} extension detach testing-manual`)
      .end()
  });

  ['extension', 'theme'].forEach((ext) => {
    it(`should upload ${ext}`, async function () {
      if (!config[`TEST_${ext.toUpperCase()}_UPLOAD`]) {
        this.skip()
        return
      }
      const extensionDirectoryName = utils.uploadable.replace('/', '-')
      const extensionsDirectory = ext === 'extension' ? 'extensions' : 'themes'
      const testExtensionDirectory = path.join(utils.appDir, extensionsDirectory, extensionDirectoryName)
      await fsEx.mkdirp(testExtensionDirectory, { mode: '777' })
      await fsEx.copy(path.resolve(__dirname, 'fixtures', '@shopgateIntegrationTest-testingUpload'), testExtensionDirectory)

      const extensionConfigPath = path.join(testExtensionDirectory, 'extension-config.json')
      const extensionConfig = await fsEx.readJSON(extensionConfigPath)
      extensionConfig.id = utils.uploadable
      await fsEx.writeJSON(extensionConfigPath, extensionConfig)
      const extensionId = `${extensionConfig.id}@${extensionConfig.version}`

      const proc = spawn(utils.executable, [ext, 'upload', extensionDirectoryName], {
        cwd: utils.workingDir,
        env: { ...utils.env, INTEGRATION_TEST: 'true' }
      })

      const { messages, debugMessages } = await new Promise((resolve, reject) => {
        const messages = []
        const debugMessages = []
        proc.stdout.on('data', (chunk) => {
          const logs = chunk.toString().split(/\n/).filter(Boolean)
          logs.forEach((log) => {
            try {
              const { msg } = JSON.parse(log)
              debugMessages.push(msg)
            } catch (e) {
              messages.push(log)
            }
          })
        })
        proc.on('close', () => resolve({ messages, debugMessages }))
        proc.on('error', reject)
      })

      assert.deepStrictEqual(messages, [
        `Packing ${extensionId}`,
        `Uploading ${extensionId}`,
        `Preprocessing ${extensionId}`,

        ext === 'extension'
          ? `Extension ${extensionId} was successfully uploaded`
          : `Theme ${extensionId} was successfully uploaded`
      ])

      if (debugMessages.length) {
        const rePacked = new RegExp(`^Packed ${extensionId} into (.*)${path.sep}${extensionDirectoryName}.tar.gz$`)
        const reDeleting = new RegExp(`^Deleting (.*)${path.sep}${extensionDirectoryName}.tar.gz$`)
        let tempDirectory

        debugMessages.some((message, i) => {
          const match = message.match(rePacked) || message.match(reDeleting)
          if (match) {
            tempDirectory = match[1]
          }
          return tempDirectory
        })

        const archivePath = path.join(tempDirectory, extensionDirectoryName)

        assert.deepStrictEqual(debugMessages, [
          `Building a list of exclusions based on .gitignore file`,
          `.gitignore does not exist in ${testExtensionDirectory}. Using defaults`,
          `Packing ${testExtensionDirectory} into tar archive...`,
          `Packed ${extensionId} into ${archivePath}.tar.gz`,
          `Deleting ${archivePath}.tar.gz`,
          `Uploaded ${extensionId}`,
          `Preprocessing of ${extensionId} finished`
        ])
      }
    })
  })
})
