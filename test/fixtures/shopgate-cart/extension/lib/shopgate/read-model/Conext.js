/**
 * @typedef {Object} Context
 * @property {ContextLogger} log
 * @property {PipelineConfiguration} config
 * @property {ExtensionStorage} storage
 */

/**
 * @typedef {Object} ContextLogger
 * @method {LoggerContextLogInfo} info
 */

/**
 * @typedef {Object} ExtensionStorage
 * @property {ContextStorage} extension
 * @property {ContextStorage} device
 * @property {ContextStorage} user
 */

/**
 * @typedef {Object} ContextStorage
 * @property {StorageSetCallback} set
 * @property {StorageGetCallback} get
 * @property {StorageDelCallback} del
 */

/**
 * @callback StorageSetCallback
 * @param {string} key
 * @param {string|number|Object} value
 * @param {StorageCallback}
 */

/**
 * @callback StorageGetCallback
 * @param {string} key
 * @param {StorageCallback}
 */

/**
 * @callback StorageDelCallback
 * @param {string} key
 * @param {StorageCallback}
 */

/**
 * @callback StorageCallback
 * @param {Error|null} error
 * @param {string|number|Object} value
 */

/**
 * @typedef {Object} PipelineConfiguration
 * @property {string} fhemApiUrl
 * @property {string} basicAuthUsername
 * @property {string} basicAuthPassword
 */
