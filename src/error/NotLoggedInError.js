const UnauthorizedClientError = require('./UnauthorizedClientError');

class NotLoggedInError extends UnauthorizedClientError {
}
module.exports = NotLoggedInError;
