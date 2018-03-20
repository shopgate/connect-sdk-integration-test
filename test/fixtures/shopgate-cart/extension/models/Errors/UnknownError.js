const EUNKNOWN = 'EUNKNOWN'

class UnknownError extends Error {
  constructor () {
    super();
    this.code = EUNKNOWN
    this.message = 'An internal error occured.';
    this.displayMessage = null
  }
}

module.exports = UnknownError
