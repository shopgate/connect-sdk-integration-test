process.env.INTEGRATION_TEST = 'true'
process.env.LOG_LEVEL = 'debug'
/**
 * @type {IntegrationTestUtils}
 */
const tools = require('./IntegrationTestUtils.js')

const e = {
  exec: require('child_process').exec,
  assert: require('assert'),
  tools: tools
}

module.exports = e