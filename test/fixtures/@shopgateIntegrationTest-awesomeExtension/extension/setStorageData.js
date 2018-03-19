module.exports = function (context, input, cb) {
  const keys = {
    device: 'deviceKey',
    extension: 'extensionKey',
    user: 'userKey'
  }
  const { extension, device, user } = input
  context.storage.extension.set(keys.extension, extension, () => {
    context.storage.device.set(keys.device, device, () => {
      context.storage.user.set(keys.user, user, function (error, success) {
        return cb(error, { extension, device, user })
      })
    })
  })
}
