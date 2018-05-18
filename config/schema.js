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
  altAppId: {
    doc: 'Alternativ application id to test with (shared by all tests; don\'t use the backend/frontend action with this shop)',
    default: 'shop_31494',
    format: String,
    env: 'SGC_ALT_APP_ID'
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
  }
}
