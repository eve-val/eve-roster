// roster.js
// GET / -> returns JSON representing entire corp roster.

var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
	res.send('Get the roster');
});

module.exports = router;
