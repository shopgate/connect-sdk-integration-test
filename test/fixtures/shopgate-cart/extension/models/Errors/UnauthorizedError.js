const EACCESS = 'EACCESS'

class UnauthorizedError extends Error {
  constructor (displayMessage) {
    super();
    this.code = EACCESS
    this.message = 'Permission denied.'
    this.displayMessage = (displayMessage !== undefined) ? displayMessage : null
  }
}

module.exports = UnauthorizedError
