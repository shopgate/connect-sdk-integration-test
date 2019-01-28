process.env.INTEGRATION_TEST = 'true'
process.env.LOG_LEVEL = 'debug'
process.env.PROXY_PORT = '8813'

/**
 * @type {IntegrationTestUtils}
 */
const { IntegrationTestUtils } = require('./IntegrationTestUtils.js')

const e = {
  exec: require('child_process').exec,
  assert: require('assert'),
  utils: require('./utils')
}

Object.defineProperty(e, 'tools', {
  get: () => new IntegrationTestUtils()
})

module.exports = e
