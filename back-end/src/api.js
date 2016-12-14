const dao = require('./dao.js');
const fs = require('fs');
const path = require('path');

const express = require('express');

// /api routes
const router = express.Router();

function sendStub(res, filepath) {
  res.type('json');
  res.send(fs.readFileSync(path.join(__dirname, filepath), 'utf8'));
}

router.get('/dashboard', function(req, res) {
  sendStub(res, '../api-stubs/dashboard.json');
});

// GET -> returns JSON representing entire corp roster.
router.get('/roster', function(req, res) {
  sendStub(res, '../api-stubs/roster.json');
});

router.get('/character/:id', function(req, res) {
  sendStub(res, '../api-stubs/character.json');
});

router.get('/character/:id/skills', function(req, res) {
  sendStub(res, '../api-stubs/character.skills.json');
});

router.put('/character/:id/apikey', function(req, res) {
  sendStub(res, '../api-stubs/character.apikey.json');
});


module.exports = router;
