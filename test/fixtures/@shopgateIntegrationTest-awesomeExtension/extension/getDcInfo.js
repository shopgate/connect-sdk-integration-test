module.exports = function (context, input, cb) {
  const output = {}
  context.app.getInfo((error, info) => {
    if (error) return cb(null, error)
    output.appInfo = info
    context.device.getInfo((error, info) => {
      if (error) return cb(null, error)
      output.deviceInfo = info
      cb(null, output)
    })
  })
}
