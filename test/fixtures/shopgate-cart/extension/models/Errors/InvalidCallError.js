const EINVALIDCALL = 'EINVALIDCALL'

class InvalidCallError extends Error {
  constructor (message) {
    super();
    this.code = EINVALIDCALL
    this.message = (message !== null && message !== undefined) ? message : 'The pipeline can\'t be called in the given context.'
    this.displayMessage = null
  }
}

module.exports = InvalidCallError
