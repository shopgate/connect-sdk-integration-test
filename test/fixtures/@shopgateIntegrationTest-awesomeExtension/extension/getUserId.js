/**
 * Step to get user Id
 *
 * @param {object} context
 * @param {object} context.meta
 * @param {?string} context.meta.userId
 *
 * @param {object} input
 *
 * @param {Function} cb
 */
module.exports = function (context, input, cb) {
  cb(null, {
    userId: context.meta.userId
  })
}
