/**
 * @typedef {object} config
 * @property {string} cakeUrl
 * @property {string} apiKey
 * @property {string} accessToken
 *
 * @param {object} config
 * @return {object}
 */
module.exports = function (config) {
  const module = {}
  const shopgateApi = {
    cakeUrl: config.cakeUrl,
    requestHeaders: {
      'User-Agent': 'shopgate-internal-extension',
      'Accept': 'application/json',
      'Accept-Charset': 'utf-8',
      'Content-Type': 'application/json',
      'SGXS': 'true'
    }
  }

  module.getCakeUrl = function () {
    return shopgateApi.cakeUrl
  }

  module.getRequestHeaders = function () {
    return shopgateApi.requestHeaders
  }

  return module
}
