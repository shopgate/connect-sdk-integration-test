const FhemApiFactory = require('./fhem-api/Factory')

/**
 * @param {Context} context
 * @param {GetDeviceInput} input
 * @param {GetDeviceExtensionCallback} cb
 */
module.exports = async (context, input, cb) => {
  const fhemApiFactory = new FhemApiFactory()
  const fhemApiClient = fhemApiFactory.get(
    context.config.fhemApiUrl, {
      username: context.config.basicAuthUsername,
      password: context.config.basicAuthPassword
    }
  )
  try {
    return {devices: await fhemApiClient.getDevices()}
  } catch (error) {
    context.log.info(error)
    throw error
  }
}
