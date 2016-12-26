const UserVisibleError = require('../error/UserVisibleError');

/**
 * Wraps an Express route handler function with standard error handling and
 * logging. The handler function should return a promise to a "payload" object
 * that will make up the JSON response.
 */
function jsonEndpoint(handler) {
  return function(req, res) {
    handler(req, res)
    .then(function(payload) {
      let space = req.query.pretty != undefined ? 2 : undefined;
      res.type('json');
      res.send(JSON.stringify(payload, null, space));
    })
    .catch(function(e) {
      console.error('ERROR while handling endpoint %s', req.originalUrl);
      console.error('  accountId:', req.session.accountId);
      console.error(e);

      res.status(500);
      res.type('json');
      let message;
      if (e instanceof UserVisibleError) {
        message = e.message;
      } else {
        message = 'There was a server error. Please try again.';
      }
      res.send({ message: message });
    });
  }
}

module.exports = jsonEndpoint;
