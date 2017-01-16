/**
 * Wraps an Express route handler function with standard error handling and
 * logging. The `type` attribute should be either `'html'` or `'json'`. If
 * the `type` is `'html'`, the `handler` should return a promise to an object
 * with the structure `{ template: 'myTemplate', data: { ... } }`. If the `type`
 * is `'json'`, `handler` should return a promise to the Object that will make
 * up the JSON response.
 */
const BadRequestError = require('../error/BadRequestError');
const NotFoundError = require('../error/NotFoundError');
const NoSuchAccountError = require('../error/NoSuchAccountError');
const NotLoggedInError = require('../error/NotLoggedInError');
const UnauthorizedClientError = require('../error/UnauthorizedClientError');
const UserVisibleError = require('../error/UserVisibleError');

const dao = require('../dao');
const privileges = require('./privileges');
const CONFIG = require('../config-loader').load();


function protectedEndpoint(type, handler) {
  if (type != 'json' && type != 'html') {
    throw new Error('Unsupported endpoint type: ' + type);
  }

  return function(req, res) {
    let account;
    let payload;

    Promise.resolve()
    .then(() => {
      let accountId = req.session.accountId;
      if (accountId == null) {
        throw new NotLoggedInError();
      }
      return dao.getAccountDetails(accountId);
    })
    .then(([accountRow]) => {
      if (accountRow == null) {
        throw new NoSuchAccountError();
      }
      account = accountRow;
      return privileges.get(account.id)
    })
    .then(privs => {
      return handler(req, res, account, privs);
    })
    .then(_payload => {
      payload = _payload;
      if (CONFIG.debugRequestLatency) {
        return new Promise((resolve, reject) =>  {
          setTimeout(resolve, CONFIG.debugRequestLatency);
        });
      }
    })
    .then(() => {
      switch (type) {
        case 'json':
          let space = req.query.pretty != undefined ? 2 : undefined;
          res.type('json');
          res.send(JSON.stringify(payload, null, space));
          break;
        case 'html':
          res.render(payload.template, payload.data);
          break;
      }
    })
    .catch(function(e) {
      handleError(type, e, req, res);
    });
  }
}
module.exports = protectedEndpoint;


function handleError(type, e, req, res) {
  console.error('ERROR while handling endpoint %s', req.originalUrl);
  console.error('  accountId:', req.session.accountId);
  console.error(e);

  let message;

  if (type == 'html' && 
      (e instanceof NotLoggedInError || e instanceof NoSuchAccountError)) {
    req.session = null;
    res.redirect('/login');
  } else {
    let [status, message] = getResponse(e);

    res.status(status);
    switch (type) {
      case 'json':
        res.type('json');
        res.send({ message: message });
        break;
      case 'html':
        res.send(message);
        break;
    };
  }
};

function getResponse(e) {
  if (e instanceof BadRequestError) {
    return [400, 'Bad request'];
  } else if (e instanceof NotFoundError) {
    return [404, 'Not found'];
  } else if (e instanceof UnauthorizedClientError) {
    // Possibly should be 404
    return [403, 'Forbidden'];
  } else {
    let message;
    if (e instanceof UserVisibleError) {
      message = e.message;
    } else {
      message = 'Internal server error';
    }
    return [500, message];
  }
}
