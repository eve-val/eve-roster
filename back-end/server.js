var express = require("express");
var bodyParser = require("body-parser");
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files in public/
app.use(express.static('public'));

// Manually include the API routes defined in api/
var roster = require('./api/roster.js');
app.use('/roster', roster);

var server = app.listen(8081, function() {
	console.log("Listening on port %s...", server.address().port);
});
