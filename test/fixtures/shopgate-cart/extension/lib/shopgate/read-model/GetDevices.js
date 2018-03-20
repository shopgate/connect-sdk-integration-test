/**
 * @callback GetDeviceExtensionCallback
 * @param {Error|null} error
 * @param {Devices} devices
 */

/**
 * @typedef {Object} GetDeviceInput
 */

/**
 * @typedef {Object} Devices
 * @property {Device[]} devices
 */

/**
 * @typedef {Object} Device
 * @property {string} name
 * @property {Reading[]} readings
 */

/**
 * @typedef {Object} Reading
 * @property {string} name
 * @property {string} unit
 */

/**
 * @typedef {Current[]} CurrentAPIResponse
 */

/**
 * @typedef {Object} Current
 * @property {number} timestamp
 * @property {string} device
 * @property {string} type
 * @property {string} event
 * @property {string} reading
 * @property {string} value
 * @property {string} unit
 */
