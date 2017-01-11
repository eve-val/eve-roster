const express = require('express');

const privileges = require('../../route-helper/privileges');
const handleEndpointError = require('../../route-helper/handleEndpointError');

const UnauthorizedClientError = require('../../error/UnauthorizedClientError');
const UserVisibleError = require('../../error/UserVisibleError');

// /api routes
const router = express.Router();

router.use('/*', function(req, res, next) {
  // TODO: Check to make sure account ID is still valid
  let accountId = req.session.accountId;
  if (accountId == null) {
    throw new UnauthorizedClientError('Not logged in');
  } else {
    res.locals.accountId = accountId;
    privileges.get(accountId)
    .then(privs => {
      res.locals.privs = privs;
      next();
    })
    .catch(e => {
      console.error('Error while reading privs.');
      handleEndpointError(e, req, res);
    });
  }
});

router.put('/account/:id/activeTimezone', require('./account/activeTimezone'));
router.put('/account/:id/homeCitadel', require('./account/homeCitadel'));
router.put('/account/:id/mainCharacter', require('./account/mainCharacter'));

router.get('/dashboard', require('./dashboard'));
router.get('/dashboard/:id/queueSummary', require('./dashboard/queueSummary'));

router.get('/roster', require('./roster'));

router.get('/character/:id', require('./character'));
router.get('/character/:id/skills', require('./character/skills'));
router.get('/character/:id/skillQueue', require('./character/skillQueue'));

router.get('/corporation/:id', require('./corporation'));

// Global (synchronous) error handling
router.use(function (e, req, res, next) {
  handleEndpointError(e, req, res);
});

module.exports = router;
