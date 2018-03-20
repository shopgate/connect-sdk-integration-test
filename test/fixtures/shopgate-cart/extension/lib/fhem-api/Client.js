class FhemApiClient {
  /**
   * @param {HttpClient} httpClient
   * @param {string} url
   * @param {OptionAuth} basicAuth
   */
  constructor (httpClient, url, basicAuth) {
    this._httpClient = httpClient
    this._url = url
    this._basicAuth = basicAuth
  }

  /**
   * @returns {Promise<Device[]>}
   */
  async getDevices () {
    const response = await this._httpClient.get(this._url + '/current/', this._basicAuth)

    const devices = []
    response.data.map((entry) => {
      if (!devices[entry.device]) {
        devices[entry.device] = {}
        devices[entry.device].readings = []
      }
      devices[entry.device].readings.push(
        {name: entry.reading, unit: entry.unit}
      )
    })

    const responseDevices = []
    for (const device in devices) {
      responseDevices.push({
        name: device,
        readings: devices[device].readings
      })
    }

    return responseDevices
  }

  /**
   * @param {string|null} [device=null]
   * @param {string|null} [reading=null]
   * @param {number|null} [fromTimestamp=null]
   * @param {number|null} [toTimestamp=null]
   * @returns {Promise<ReadingValue[]>}
   */
  async getReadingValues (device = null, reading = null, fromTimestamp = null, toTimestamp = null) {
    const getParameters = this._buildGetParameters(device, reading)
    const response = await this._httpClient.get(this._url + '/history/' + this._buildReadingValuesUrl(fromTimestamp, toTimestamp) + (getParameters ? '?' + getParameters : ''), this._basicAuth)

    return response.data.map((entry) => {
      return {timestamp: entry.timestamp, value: entry.value, unit: entry.unit}
    })
  }

  /**
   * @param {number|null} fromTimestamp
   * @param {number|null} toTimestamp
   * @returns {string}
   * @private
   */
  _buildReadingValuesUrl (fromTimestamp, toTimestamp) {
    const parameters = []

    if (fromTimestamp) {
      parameters.push(fromTimestamp)
      if (toTimestamp) {
        parameters.push(toTimestamp)
      }
    }

    return parameters.join('/')
  }

  /**
   * @param {string|null} device
   * @param {string|null} reading
   * @returns {string}
   * @private
   */
  _buildGetParameters (device, reading) {
    const parameters = []

    if (device) {
      parameters.push('device=' + device)
      if (reading) {
        parameters.push('reading=' + reading)
      }
    }

    return parameters.join('&')
  }
}

module.exports = FhemApiClient
