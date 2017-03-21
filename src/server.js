const os = require('os');
const path = require('path');
const querystring = require('querystring');

const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');

const cron = require('./cron/cron.js');
const dao = require('./dao');

const getAccountPrivs = require('./route-helper/getAccountPrivs');

const config = require('./util/config');
const logger = require('./util/logger')(__filename);
const eve_sso = require('./util/eve-sso');

const webpack = require('webpack');
const webpackConfig = require('../webpack.config.js');

const REQUIRED_VARS = [
  'COOKIE_SECRET',
  'SSO_CLIENT_ID',
  'SSO_SECRET_KEY',
  'DB_FILE_NAME'
];

const FRONTEND_ROUTES = [
  '/',
  '/roster',
  '/character/:id',
  '/housing',
  '/admin',
  '/admin/cron-logs',
  '/admin/account-logs',
  '/admin/citadels',
];

if(REQUIRED_VARS.some(envVar => !(envVar in process.env))) {
  console.error(`Missing config param ${env_var} (check your .env file).`);
  process.exit(2);
}

let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(cookieSession({ secret: process.env.COOKIE_SECRET }));

app.set('view engine', 'pug');
app.set('views', './views');

// Development serving
if (config.isDevelopment()) {
  const webpackMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');
  const compiler = webpack(webpackConfig);
  const middleware = webpackMiddleware(compiler, {
    noInfo: true,
    publicPath: webpackConfig.output.publicPath,
    stats: {
      colors: true,
      hash: false,
      timings: true,
      chunks: false,
      chunkModules: false,
      modules: false
    }
  });

  app.use(middleware);
  app.use(webpackHotMiddleware(compiler));
}

// For healthchecks
app.get('/healthz', function(req, res) {
  res.send('ok');
});

// Includes root ('/')
app.get(FRONTEND_ROUTES, require('./route/home'));

app.get('/login', function(req, res) {
  res.render('login', {
    loginParams: eve_sso.LOGIN_PARAMS,
    backgroundUrl: Math.floor(Math.random() * 5) + '.jpg',
  });
});

app.get('/authenticate', require('./route/authenticate'));

app.get('/logout', function(req, res) {
  req.session = null;
  res.redirect('/');
});

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

// Static files in static/
app.use(express.static(path.join(__dirname, '../static')));

// Start the server
const port = process.env.PORT || 8081;
let server = app.listen(port, function() {
  logger.info(`Serving from port ${port}.`);
  cron.init();
});
