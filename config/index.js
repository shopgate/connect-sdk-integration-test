const convict = require('convict')
const config = convict(require('./schema'))
const env = config.get('env')
require('dotenv').config()
const CONFIG_PATH = process.env.CONFIG_PATH

if (CONFIG_PATH) {
  // Load a custom configuration path.
  config.loadFile(CONFIG_PATH)
} else {
  // Load the environment-specific configuration path.
  config.load(require('./env/' + env))
}

config.validate()
module.exports = config.get()
