/**
 * Wraps an Express route handler function with standard error handling and
 * logging. The handler function should return a promise to a "payload" object
 * that will make up the JSON response.
 */
const handleEndpointError = require('./handleEndpointError');


function jsonEndpoint(handler) {
  return function(req, res) {
    handler(req, res, res.locals.accountId, res.locals.privs)
    .then(function(payload) {
      let space = req.query.pretty != undefined ? 2 : undefined;
      res.type('json');
      res.send(JSON.stringify(payload, null, space));
    })
    .catch(function(e) {
      handleEndpointError(e, req, res);
    });
  }
}

module.exports = jsonEndpoint;
