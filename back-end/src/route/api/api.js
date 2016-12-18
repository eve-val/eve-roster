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

router.get('/dashboard', function(req, res) {
  let json =
      JSON.parse(
          fs.readFileSync(
              path.join(__dirname, '../../../api-stubs/dashboard.json'),
              'utf8'));

  let accountId = req.session.accountId;

  dao.builder('ownership')
      .select('character.id', 'character.name', 'accessToken.needsUpdate')
      .join('character', 'character.id', '=', 'ownership.character')
      .join('accessToken', 'accessToken.character', '=', 'ownership.character')
      .where('ownership.account', accountId)
  .then(function(rows) {
    for (let i = 0; i < rows.length; i++) {
      let row = rows[i];
      json.characters.unshift({
        id: row.id,
        name: row.name,
        hasApiKey: !row.needsUpdate,
        skillInTraining: null,
        queue: null,
      })
    }
    res.type('json');
    res.send(JSON.stringify(json));
  })
  .catch(function(err) {
    // TODO
    console.log('ERROR:', err);
    res.send(err);
  });
});

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
