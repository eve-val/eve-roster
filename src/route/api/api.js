const express = require('express');

const privileges = require('../../route-helper/privileges');

const UnauthorizedClientError = require('../../error/UnauthorizedClientError');
const UserVisibleError = require('../../error/UserVisibleError');

// /api routes
const router = express.Router();

router.get('/admin/accountLog', require('./admin/accountLog'));
router.get('/admin/cronLog', require('./admin/cronLog'));

router.put('/account/:id/activeTimezone', require('./account/activeTimezone'));
router.put('/account/:id/homeCitadel', require('./account/homeCitadel'));
router.put('/account/:id/mainCharacter', require('./account/mainCharacter'));

router.get('/dashboard', require('./dashboard'));
router.get('/dashboard/:id/queueSummary', require('./dashboard/queueSummary'));

router.get('/roster', require('./roster'));

router.get('/character/:id', require('./character'));
router.put('/character/:id', require('./character/characterPut'));
router.get('/character/:id/skills', require('./character/skills'));
router.get('/character/:id/skillQueue', require('./character/skillQueue'));

router.get('/citadels', require('./citadels'));

router.get('/corporation/:id', require('./corporation'));

module.exports = router;
