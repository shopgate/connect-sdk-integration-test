const resolvePath = require('path').resolve
const config = require('./config/index.js')
const intercept = require('intercept-stdout')

const envs = [
  'appId',
  'executable',
  'username',
  'password'
]

envs.forEach((key) => {
  if (!config[key]) throw new Error('Missing env: ' + key)
})

config.executable = resolvePath(config.executable)

intercept(function (txt) {
  let filtered = txt
  envs.forEach(key => {
    const val = config[key]
    // filtered = filtered.replace(val, `**${key}**`)
  })
  return filtered
})
module.exports = config
