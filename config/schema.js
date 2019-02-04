module.exports = {
  env: {
    doc: 'The applicaton environment.',
    format: ['development', 'production'],
    default: 'development',
    env: 'NODE_ENV',
    arg: 'node-env'
  },
  componentName: {
    doc: 'Name of this component',
    default: 'connect-sdk-integration'
  },
  appId: {
    doc: 'Application id to test with',
    default: null,
    format: String,
    env: 'SGC_APP_ID'
  },
  executable: {
    doc: 'Path to the connect sdk executable',
    default: null,
    format: String,
    env: 'SGC_EXECUTABLE'
  },
  username: {
    doc: 'Email address of the test user',
    default: null,
    format: String,
    env: 'SGC_USERNAME'
  },
  password: {
    doc: 'Password of the test user',
    default: null,
    format: String,
    env: 'SGC_PASSWORD'
  },
  uploadable: {
    doc: 'Name of the extension to upload',
    default: null,
    format: String,
    env: 'SGC_UPLOADABLE'
  }
}
