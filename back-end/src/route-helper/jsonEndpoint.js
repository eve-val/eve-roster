/**
 * Wraps an Express route handler function with standard error handling and
 * logging. The handler function should return a promise to a "payload" object
 * that will make up the JSON response.
 */
const handleEndpointError = require('./handleEndpointError');
const CONFIG = require('../config-loader').load();


function jsonEndpoint(handler) {
  return function(req, res) {
    let promise;
    let payload;
    try {
      promise = handler(req, res, res.locals.accountId, res.locals.privs);
      if (!promise) {
        throw new Error('Handler didn\'t return a promise.');
      }
      promise
      .then(finalPayload => {
        payload = finalPayload;
        if (CONFIG.debugRequestLatency) {
          return new Promise((resolve, reject) =>  {
            setTimeout(resolve, CONFIG.debugRequestLatency);
          });
        }
      })
      .then(() => {
        let space = req.query.pretty != undefined ? 2 : undefined;
        res.type('json');
        res.send(JSON.stringify(payload, null, space));
      })
      .catch(function(e) {
        handleEndpointError(e, req, res);
      });
    } catch (e) {
      handleEndpointError(e, req, res);
    }
  }
}

module.exports = jsonEndpoint;
