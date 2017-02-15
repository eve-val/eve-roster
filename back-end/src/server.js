const path = require('path');
const querystring = require('querystring');

const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');

const configLoader = require('./config-loader');
const cron = require('./cron/cron.js');
const dao = require('./dao');

const getAccountPrivs = require('./route-helper/getAccountPrivs');
const routes = require('../../shared/src/routes');
const logger = require('./util/logger')(__filename);


const CONFIG = configLoader.load();

let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser(CONFIG.cookieSecret));
app.use(cookieSession({
  secret: CONFIG.cookieSecret
}));

app.set('view engine', 'pug');
app.set('views', './views');

// Includes root ('/')
app.get(routes.frontEnd, require('./route/home'));

app.get('/login', function(req, res) {
  res.render('login', {
    loginParams: querystring.stringify({
      'response_type': 'code',
      'redirect_uri': 'http://localhost:8081/authenticate',
      'client_id':  CONFIG.ssoClientId,
      'scope': CONFIG.ssoScope.join(' '),
      'state': '12345',
    }),
    backgroundUrl: Math.floor(Math.random() * 5) + '.jpg',
  });
});

app.get('/authenticate', require('./route/authenticate'));

app.get('/logout', function(req, res) {
  req.session = null;
  res.redirect('/');
});

// Static files in static/
app.use(express.static(path.join(__dirname, '../static')));

// Manually include the API routes defined in api/
app.use('/api', require('./route/api/api.js'));

// Mount the web panel provided by scribe but guard it with a privilege check
app.use('/logs', (req, res, next) => {
  getAccountPrivs(req.session.accountId)
  .then(accountPrivs => {
    accountPrivs.privs.requireRead('serverLogs', false);
    next();
  })
  .catch(e => {
    logger.error('Error when attempting to view server logs', e);
    res.redirect('/');
  });
}, logger.webPanel());

// Start the server
let server = app.listen(getServingPort(), function() {
  logger.info('Listening on port %s...', server.address().port);
  cron.init();
});

function getServingPort() {
  switch (CONFIG.serveMode) {
    case 'production':
      return 80;
    case 'dev-backend':
      return 8081;
    case 'dev-frontend':
      return 8082;
    default:
      throw new Error('Invalid serveMode: ' + CONFIG.serveMode);
  }
}
