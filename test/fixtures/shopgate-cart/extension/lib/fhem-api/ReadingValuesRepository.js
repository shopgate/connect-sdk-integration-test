class FhemApiReadingValuesRepository {
  /**
   * @param {FhemApiClient} client
   * @param {FHEMApiExtensionStorage} storage
   */
  constructor (client, storage) {
    this._client = client
    this._storage = storage
  }

  /**
   * @param {string} device
   * @param {string} reading
   * @param {number} fromTimestamp
   * @param {number|null} toTimestamp
   *
   * @returns {Promise<ReadingValue[]>}
   */
  async get (device, reading, fromTimestamp, toTimestamp = null) {
    toTimestamp = toTimestamp === null ? new Date().getTime() : toTimestamp
    const timestamps = this.getDates(fromTimestamp, toTimestamp)
    const cachePrefix = device + '.' + reading + '.'
    const readingValues = []

    console.log('got ' + timestamps.length + ' initial timestamps')

    const storageReadResults = await this.getStorageReadResults(cachePrefix, timestamps)
    const timestampsForApiCall = []
    for (let i = 0; i < timestamps.length; ++i) {
      if (timestamps[i] === this.timestampToMidnightTimestamp(toTimestamp) || !storageReadResults[i]) {
        // get the latest data for today or data not available locally
        timestampsForApiCall.push(timestamps[i])
        continue
      }

      Array.prototype.push.apply(readingValues, this.getTimestampsBetween(fromTimestamp, toTimestamp, storageReadResults[i]))
    }

    console.log('got ' + (timestamps.length - timestampsForApiCall.length) + ' cached reading values')
    console.log('got ' + timestampsForApiCall.length + ' timestamps for api calls')

    const deviceReadingsResponses = await Promise.all(await this.getRequests(device, reading, timestampsForApiCall))

    for (let i = 0; i < deviceReadingsResponses.length; ++i) {
      Array.prototype.push.apply(readingValues, this.getTimestampsBetween(fromTimestamp, toTimestamp, deviceReadingsResponses[i]))
    }

    console.log('got ' + deviceReadingsResponses.length + ' api readingValues')

    await this.saveDeviceReadingsToStorage(cachePrefix, timestampsForApiCall, deviceReadingsResponses)

    return readingValues
  }

  /**
   * @param {number} fromTimestamp
   * @param {number} toTimestamp
   * @param {ReadingValue[]} readingValues
   */
  getTimestampsBetween (fromTimestamp, toTimestamp, readingValues) {
    const validReadingValues = []
    for (const readingValue of readingValues) {
      if (readingValue.timestamp < fromTimestamp || readingValue.timestamp > toTimestamp) {
        continue
      }

      validReadingValues.push(readingValue)
    }

    return validReadingValues
  }

  /**
   * @param {string} cachePrefix
   * @param {number[]} timestamps
   * @param {ReadingValue[]} deviceReadingsResponses
   */
  async saveDeviceReadingsToStorage (cachePrefix, timestamps, deviceReadingsResponses) {
    const saveStoragePromises = []
    for (let i = 0; i < timestamps.length; ++i) {
      // TODO: waiting for fix
      saveStoragePromises.push(await this._storage.set(cachePrefix + timestamps[i].toString(), deviceReadingsResponses[i]))
    }
    //await Promise.all(saveStoragePromises)
  }

  /**
   * @param {string} cachePrefix
   * @param {number[]} timestamps
   * @returns {Promise<[undefined|ReadingValue[]]>}
   */
  async getStorageReadResults (cachePrefix, timestamps) {
    const readStoragePromises = []
    for (let i = 0; i < timestamps.length; ++i) {
      // TODO: awaiting fix
      readStoragePromises.push(await this._storage.get(cachePrefix + timestamps[i].toString()))
    }

    // return await Promise.all(readStoragePromises)
    return readStoragePromises
  }

  /**
   * @param {number} fromTimestamp
   * @param {number} toTimestamp
   * @returns {number[]}
   */
  getDates (fromTimestamp, toTimestamp) {
    const todayMidnight = this.timestampToMidnightTimestamp(new Date().getTime())
    const timestamps = []

    if (todayMidnight < fromTimestamp) {
      timestamps.push(todayMidnight)
      return timestamps
    }

    for (let day = this.timestampToMidnightTimestamp(fromTimestamp); day < this.timestampToMidnightTimestamp(toTimestamp); day += 86400000) {
      timestamps.push(day)
    }

    timestamps.push(this.timestampToMidnightTimestamp(toTimestamp))

    return timestamps
  }

  /**
   * @param {string} device
   * @param {string} reading
   * @param {number[]} timestamps
   *
   * @returns {Promise<ReadingValue[]>[]}
   */
  async getRequests (device, reading, timestamps) {
    const requestPromises = []

    for (let timestamp of timestamps) {
      requestPromises.push(this._client.getReadingValues(device, reading, timestamp, timestamp + 864000000))
    }

    return requestPromises
  }

  /**
   * @param {number} timestamp
   * @returns {number}
   */
  timestampToMidnightTimestamp (timestamp) {
    const date = new Date(timestamp)
    date.setHours(0, 0, 0, 0)

    return date.getTime()
  }

  getTodayMidnightTimestamp () {
    const timestamp = new Date().getTime()
    timestamp.setHours(0, 0, 0, 0)

    return timestamp
  }

}

module.exports = FhemApiReadingValuesRepository
