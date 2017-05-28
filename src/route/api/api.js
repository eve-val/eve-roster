const express = require('express');

const privileges = require('../../route-helper/privileges');

const UnauthorizedClientError = require('../../error/UnauthorizedClientError');
const UserVisibleError = require('../../error/UserVisibleError');

// /api routes
const router = express.Router();

router.get('/admin/accountLog', require('./admin/accountLog'));
router.post('/admin/citadel', require('./admin/citadelAdd'));
router.put('/admin/citadel/:id', require('./admin/citadelPut'));
router.delete('/admin/citadel/:id', require('./admin/citadelDelete'));
router.get('/admin/setup/', require('./admin/setup_get'));
router.put('/admin/setup/', require('./admin/setup_put'));
router.get('/admin/cronLog', require('./admin/cronLog'));
router.put('/admin/cronLog/:task', require('./admin/cronPut'));

router.put('/account/:id/activeTimezone', require('./account/activeTimezone'));
router.put('/account/:id/homeCitadel', require('./account/homeCitadel'));
router.put('/account/:id/mainCharacter', require('./account/mainCharacter'));

router.post('/account/:id/transfer', require('./account/transferCharacter'));
router.delete('/account/:id/transfer/:charId', require('./account/deleteTransfer'));

router.get('/dashboard', require('./dashboard'));
router.get('/dashboard/queueSummary', require('./dashboard/queueSummary'));

router.get('/roster', require('./roster'));

router.get('/character/:id', require('./character'));
router.put('/character/:id', require('./character/characterPut'));
router.get('/character/:id/skills', require('./character/skills'));
router.get('/character/:id/skillQueue', require('./character/skillQueue'));

router.get('/citadels', require('./citadels'));

router.get('/corporation/:id', require('./corporation'));

module.exports = router;
