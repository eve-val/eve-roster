const dao = require('./dao.js');
const fs = require('fs');
const path = require('path');

const express = require('express');

// /api routes
const router = express.Router();

// GET -> returns JSON representing entire corp roster.
router.get('/roster', function(req, res) {
  res.type('json');
	res.send(fs.readFileSync(path.join(__dirname, '../api/roster.fake.json'), 'utf8'));
});

module.exports = router;
