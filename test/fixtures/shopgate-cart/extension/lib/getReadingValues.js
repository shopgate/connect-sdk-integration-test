const FhemApiFactory = require('./fhem-api/Factory')
const FhemApiReadingValuesRepository = require('./fhem-api/ReadingValuesRepository')
const FHEMApiExtensionStorage = require('./fhem-api/ExtensionStorage')

/**
 * @param {Context} context
 * @param {GetReadingValuesInput} input
 * @param {GetReadingValuesExtensionCallback} cb
 */
module.exports = async (context, input, cb) => {
  const fhemApiFactory = new FhemApiFactory()
  const fhemApiClient = fhemApiFactory.get(context.config.fhemApiUrl, {
    username: context.config.basicAuthUsername,
    password: context.config.basicAuthPassword
  })
  const readingValuesRepository = new FhemApiReadingValuesRepository(fhemApiClient, new FHEMApiExtensionStorage(context.storage.extension), context.log)

  if (input.toTimestamp && input.fromTimestamp > input.toTimestamp) {
    throw new Error('toTimestamp can not be lower than fromTimestamp')
  }
  try {
    return {
      readingValues: await readingValuesRepository.get(
        input.device,
        input.reading,
        input.fromTimestamp,
        input.toTimestamp ? input.toTimestamp : null
      )
    }
  } catch (error) {
    context.log.info(error)
    throw error
  }

}
