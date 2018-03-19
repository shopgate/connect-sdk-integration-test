module.exports = function (context, input, cb) {
  return cb(null, { success: true, userId: 'someUserId' })
}
