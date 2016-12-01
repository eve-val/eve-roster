const querystring = require('querystring');

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');

const configLoader = require('./src/config-loader');

const CONFIG = configLoader.load();

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser(CONFIG.cookieSecret));
app.use(cookieSession({
  secret: CONFIG.cookieSecret
}));

app.set('view engine', 'pug');
app.set('views', './views')

app.get('/', function(req, res) {
  if (req.session.authenticated != true) {
    // Explicitly write a value so we start tracking a session
    req.session.authenticated = false;
    res.redirect('/login');
  } else {
    res.render('home', {
      name: req.session.characterName
    });
  }
});

app.get('/login', function(req, res) {
  res.render('login', {
    loginParams: querystring.stringify({
      'response_type': 'code',
      'redirect_uri': 'http://localhost:8081/authenticate',
      'client_id':  CONFIG.ssoClientId,
      'scope': CONFIG.ssoScope.join(' '),
      'state': '12345',
    }),
  });
});

app.get('/authenticate', function(req, res) {
  console.log('AUTH QUERY:', req.query);

  // TODO: Do stuff with auth code here

  req.session.authenticated = true;
  req.session.characterName = 'Capsuleer07413';

  res.redirect('/');
});

app.get('/logout', function(req, res) {
  req.session = null;
  res.redirect('/');
});

var server = app.listen(8081, function() {
  console.log('Listening on port %s...', server.address().port);
});