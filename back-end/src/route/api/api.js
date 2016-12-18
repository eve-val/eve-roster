const fs = require('fs');
const path = require('path');

const express = require('express');

const dao = require('../../dao.js');

// /api routes
const router = express.Router();

function sendStub(res, filename) {
  res.type('json');
  res.send(
      fs.readFileSync(
          path.join(__dirname, '../../../api-stubs/', filename),
          'utf8'));
}

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

router.get('/character/:id', function(req, res) {
  sendStub(res, 'character.json');
});

router.get('/character/:id/skills', function(req, res) {
  sendStub(res, 'character.skills.json');
});

router.put('/character/:id/apikey', function(req, res) {
  sendStub(res, 'character.apikey.json');
});


module.exports = router;
