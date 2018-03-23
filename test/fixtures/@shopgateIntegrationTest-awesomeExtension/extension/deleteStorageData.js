module.exports = function (context, input, cb) {
  const keys = {
    device: 'deviceKey',
    extension: 'extensionKey',
    user: 'userKey'
  }
  context.storage.extension.del(keys.extension, () => {
    context.storage.device.del(keys.device, () => {
      context.storage.user.del(keys.user, function (error, success) {
        return cb(error, null)
      })
    })
  })
}
