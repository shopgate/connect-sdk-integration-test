
const JSONStream = require('JSONStream')
const es = require('event-stream')
const fsEx = require('fs-extra')
const path = require('path')
const { assert, exec, tools, utils } = require('../utils')
const processExists = require('process-exists')

describe('Extension Action', function () {
  this.retries(2)

  let backendProcessPid

  beforeEach(async () => {
    await tools.setup()
    await tools.login()
    await tools.initApp()
    backendProcessPid = await tools.getBackendProcess()
  })

  afterEach(async () => {
    if (await processExists(backendProcessPid)) {
      try {
        process.kill(backendProcessPid, 'SIGKILL')
      } catch (err) {
        console.log(err)
      }
      await utils.processWasKilled(backendProcessPid)
    }

    return tools.cleanup()
  })

  it('should create default structure on extension create and install frontend dependencies', async () => {
    const command = `${tools.getExecutable()} extension create frontend backend --extension @shopgateIntegrationTest/myAwesomExtension --trusted true`

    return new Promise((resolve, reject) => {
      const proc = exec(command)
      const messages = []
      proc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
        messages.push(data.msg)
      }))

      proc.on('exit', (code) => {
        try {
          assert.ok(messages.includes('Downloading boilerplate ... done'), 'should have downloaded boilerplate')
          assert.ok(messages.includes('Updating backend files ... done'), 'should have updated backend files')
          assert.ok(messages.includes('Installing frontend depenencies ...'), 'should have installed frontend dependencies')
          assert.ok(messages.includes('Extension "@shopgateIntegrationTest/myAwesomExtension" created successfully'), 'should have logged the successful extension creation')
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    })
  })

  it('should attach extensions and apply its config', async () => {
    const testExtensionFolder = path.join(tools.getAppDirectory(), 'extensions', 'testing-manual')
    await fsEx.mkdirp(testExtensionFolder, { mode: '777' })
    await fsEx.copy(path.join(tools.getRootDir(), 'test', 'fixtures', 'shopgate-cart'), testExtensionFolder)
    const command = `${tools.getExecutable()} extension attach`

    return new Promise((resolve, reject) => {
      const proc = exec(command)
      const messages = []
      proc.stdout.on('data', data => {
        messages.push(JSON.parse(data).msg)
      })

      const appConfigJson = async () => (fsEx.readJson(path.join(tools.getAppDirectory(), 'extensions', 'testing-manual', 'extension', 'config.json')))

      proc.on('exit', async (code, signal) => {
        try {
          assert.ok(messages.includes('Attached @shopgate/cart (testing-manual)'), 'should log attachment of extension')
          await new Promise(resolve => setTimeout(resolve, 2000))
          const appConfig = await appConfigJson()
          assert.equal(appConfig.cakeUrl, 'extension_config_original', 'should overwrite the extensions config.json')
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    })
  })

  it('should detach extensions', async () => {
    const testExtensionFolder = path.join(tools.getAppDirectory(), 'extensions', 'testing-manual')
    await fsEx.mkdirp(testExtensionFolder)
    await fsEx.copy(path.join(tools.getRootDir(), 'test', 'fixtures', 'shopgate-cart'), testExtensionFolder)
    const command = `${tools.getExecutable()} extension attach`

    return new Promise((resolve, reject) => {
      const proc = exec(command)
      const messages = []
      proc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
        messages.push(data.msg)
      }))

      proc.on('exit', (code, signal) => {
        try {
          assert.ok(messages.includes('Attached @shopgate/cart (testing-manual)'), 'should log attachment of extension')
          const detProc = exec(`${tools.getExecutable()} extension detach testing-manual`)
          detProc.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
            messages.push(data.msg)
          }))
          detProc.on('exit', async () => {
            try {
              assert.ok(messages.includes('Detached @shopgate/cart'), 'should log detachment of extension')
              resolve()
            } catch (err) {
              reject(err)
            }
          })
        } catch (err) {
          reject(err)
        }
      })
    })
  });

  ['extension', 'theme'].forEach((ext) => {
    it.only(`should upload ${ext}`, async () => {
      const extensionDirectoryName = '@shopgateIntegrationTest-testingUpload'
      const extensionsDirectory = ext === 'extension' ? 'extensions' : 'themes'
      const testExtensionDirectory = path.join(tools.getAppDirectory(), extensionsDirectory, extensionDirectoryName)
      await fsEx.mkdirp(testExtensionDirectory, { mode: '777' })
      await fsEx.copy(path.join(tools.getRootDir(), 'test', 'fixtures', extensionDirectoryName), testExtensionDirectory)
      const command = `${tools.getExecutable()} ${ext} upload ${extensionDirectoryName}`
      const messages = []
      const debugMessages = []

      await new Promise((resolve, reject) => {
        const proc = exec(command)

        proc.stdout.on('data', (data) => {
          try {
            const log = JSON.parse(data.toString())
            debugMessages.push(log.msg)
          } catch (err) {
            messages.push(data.toString())
          }
        })

        proc.on('exit', () => {
          resolve()
        })
      })

      const extensionConfig = await fsEx.readJSON(path.join(testExtensionDirectory, 'extension-config.json'))
      const extensionId = `${extensionConfig.id}@${extensionConfig.version}`

      assert.deepStrictEqual(messages, [
        `Packing ${extensionId}\n`,
        `Uploading ${extensionId}\n`,
        `Preprocessing ${extensionId}\n`,

        ext === 'extension'
          ? `Extension ${extensionId} was successfully uploaded\n`
          : `Theme ${extensionId} was successfully uploaded\n`
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

        assert.deepStrictEqual(debugMessages, [
          `Building a list of exclusions based on .gitignore file`,
          `.gitignore does not exist in ${testExtensionDirectory}. Using defaults`,
          `Packing ${testExtensionDirectory} into tar archive...`,
          `Packed ${extensionId} into ${tempDirectory}${path.sep}${extensionDirectoryName}.tar.gz`,
          `Deleting ${tempDirectory}${path.sep}${extensionDirectoryName}.tar.gz`,
          `Uploaded ${extensionId}`,
          `Preprocessing of ${extensionId} finished`
        ])
      }
    })
  })
})
