module.exports = function (context, input, cb) {
  const output = {
    device: 'wrong', user: 'wrong', extension: 'wrong'
  }
  const keys = {
    device: 'deviceKey',
    extension: 'extensionKey',
    user: 'userKey'
  }

  context.storage.extension.get(keys.extension, (error, value) => {
    if (error) throw error
    output.extension = value || 'empty'
    context.storage.user.get(keys.user, (error, value) => {
      if (error) throw error
      output.user = value || 'empty'
      context.storage.device.get(keys.device, (error, value) => {
        if (error) throw error
        output.device = value || 'empty'
        cb(null, output)
      })
    })
  })
}
