const fs = require('fs');
const path = require('path');

const express = require('express');

const dao = require('../../dao.js');
const sendStub = require('./send-stub');

// /api routes
const router = express.Router();

router.get('/*', function(req, res, next) {
  // TODO: Check to make sure account ID is still valid
  // and that account has permissions to access this path
  if (req.session.accountId == null) {
    res.status(401).send('401 Unauthorized');
  } else {
    next();
  }
});

router.get('/dashboard', require('./dashboard'));

// GET -> returns JSON representing entire corp roster.
router.get('/roster', function(req, res) {
  sendStub(res, 'roster.json');
});

router.get('/character/:id', require('./character'));
router.get('/character/:id/skills', require('./character/skills'));

router.get('/corporation/:id', require('./corporation'));

module.exports = router;
