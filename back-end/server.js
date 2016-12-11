const path = require('path');
const querystring = require('querystring');

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const request = require('request');

const routes = require('../shared/src/routes');
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

// Includes root ('/')
app.get(routes.frontEnd, function(req, res) {
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

  let authCode =
      Buffer.from(CONFIG.ssoClientId + ':' + CONFIG.ssoSecretKey)
          .toString('base64');

  request.post('https://login.eveonline.com/oauth/token', {
    headers: {
      'Authorization': 'Basic ' + authCode,
    },
    form: {
      grant_type: 'authorization_code',
      code: req.query.code,
    }
  }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      let parsedResponse = JSON.parse(body);

      console.log('Auth successful! Auth token is %s', parsedResponse.access_token);
      console.log('  Full response:', parsedResponse);

      // TODO: Do something with access_token

      req.session.authenticated = true;
      req.session.characterName = 'Capsuleer07413';
      res.redirect('/');
    } else {
      console.error('Something bad happened while trying to get an auth token:',
          error, response.statusCode, body);
      // TODO show something to the user
      res.redirect('/');
    }

  });
});

app.get('/logout', function(req, res) {
  req.session = null;
  res.redirect('/');
});

// Static files in static/
app.use(express.static(path.join(__dirname, 'static')));

// Manually include the API routes defined in api/
var api = require('./api');
app.use('/api', api);

var server = app.listen(8082, function() {
  console.log('Listening on port %s...', server.address().port);
});
