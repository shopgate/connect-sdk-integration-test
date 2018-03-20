/**
 * @callback GetReadingValuesExtensionCallback
 * @param {Error|null} error
 * @param {ReadingValueDef|null} readingValues
 */

/**
 * @typedef {Object} GetReadingValuesInput
 * @property {string} device
 * @property {string} reading
 * @property {number|null} [fromTimestamp=null]
 * @property {number|null} [toTimestamp=null]
 */

/**
 * @typedef {Object} ReadingValueDef
 * @property {ReadingValue[]} readingValues
 */

/**
 * @typedef {Object} ReadingValue
 * @property {number} timestamp
 * @property {string} value
 * @property {string} unit
 */

/**
 * @typedef {ReadingValue[]} ReadingValuesAPIResponse
 */
