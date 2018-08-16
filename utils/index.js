process.env.INTEGRATION_TEST = 'true'
process.env.LOG_LEVEL = 'debug'
process.env.PROXY_PORT = '8813'

/**
 * @type {IntegrationTestUtils}
 */
const tools = require('./IntegrationTestUtils.js')

const e = {
  exec: require('child_process').exec,
  assert: require('assert'),
  tools: tools,
  utils: require('./utils'),
}

module.exports = e
