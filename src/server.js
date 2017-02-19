const os = require('os');
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
const routes = require('./routes');
const logger = require('./util/logger')(__filename);

const webpack = require('webpack');
const webpackConfig = require('../webpack.config.js');

const CONFIG = configLoader.load();

const isDeveloping = process.env.NODE_ENV !== 'production';
const listenPort = isDeveloping ? 8081 : process.env.PORT;
const externalPort = isDeveloping ? 8081 : process.env.DOKKU_NGINX_PORT;
const externalHostname = isDeveloping ? 'localhost' : process.env.HOSTNAME;

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
      'redirect_uri': `http://${externalHostname}:${externalPort}/authenticate`,
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

if (isDeveloping) {
  const webpackMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');
  const compiler = webpack(webpackConfig);
  const middleware = webpackMiddleware(compiler, {
    publicPath: webpackConfig.output.publicPath,
    contentBase: 'src',
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
  app.get('/dist/home.build.js', function response(req, res) {
    res.write(middleware.fileSystem.readFileSync(path.join(__dirname, 'dist/home.build.js')));
    res.end();
  });
}

// Start the server
let server = app.listen(listenPort, function() {
  logger.info(`Server is running at http://${externalHostname}:${externalPort}`);
  cron.init();
});
