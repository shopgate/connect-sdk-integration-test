const FhemApiClient = require('./Client')
const axios = require('axios')

class FhemApiFactory {
  /**
   * @param {string} url
   * @param {Auth} basicAuth
   * @returns FhemApiClient
   */
  get (url, basicAuth) {
    return new FhemApiClient(axios, url, {auth: basicAuth})
  }
}

module.exports = FhemApiFactory
