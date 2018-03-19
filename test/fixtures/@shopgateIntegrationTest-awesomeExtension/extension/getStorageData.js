module.exports = function (context, input, cb) {
  const output = {
    device: 'wrong', user: 'wrong', extension: 'wrong'
  }
  const keys = {
    device: 'deviceKey',
    extension: 'extensionKey',
    user: 'userKey'
  }

  context.storage.device.get(keys.device, (error, value) => {
    if (error) value = error
    output.device = value

    context.storage.extension.get(keys.extension, (error, value) => {
      if (error) value = error
      output.extension = value

      context.storage.user.get(keys.user, (error, value) => {
        if (error) value = error
        output.user = value || context.meta.userId

        cb(null, output)
      })
    })
  })
}
