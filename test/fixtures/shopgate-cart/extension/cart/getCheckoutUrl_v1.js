const Url = require('../models/url')

/**
 * @param {object} context
 * @param {object} input
 * @param {function} cb
 */
module.exports = function (context, input, cb) {
  const url = new Url()
  cb(null, url)
}
