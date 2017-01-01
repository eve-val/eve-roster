const UnauthorizedClientError = require('../error/UnauthorizedClientError');
const UserVisibleError = require('../error/UserVisibleError');

module.exports = function(e, req, res) {
  console.error('ERROR while handling endpoint %s', req.originalUrl);
  console.error('  accountId:', req.session.accountId);
  console.error(e);

  let message;

  if (e instanceof UnauthorizedClientError) {
    // Possibly should be 404
    res.status(403);
    message = 'Forbidden';
  } else {
    res.status(500);
    
    if (e instanceof UserVisibleError) {
      message = e.message;
    } else {
      message = 'Internal Server Error';
    }
  }
  res.type('json');
  res.send({ message: message });
}
