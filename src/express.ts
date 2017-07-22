
import path = require('path');
import querystring = require('querystring');

import Promise = require('bluebird');
import express = require('express');
import bodyParser = require('body-parser');
import cookieParser = require('cookie-parser');
import cookieSession = require('cookie-session');
import webpack = require('webpack');

import { Tnex } from './tnex';
import { isDevelopment } from './util/config';
import { LOGIN_PARAMS } from './util/ccpSso';
import { getAccountPrivs } from './route-helper/getAccountPrivs';
import { endSession } from './route-helper/protectedEndpoint';

import { default as route_api } from './route/api/api';
import { default as route_home } from './route/home';
import { default as route_authenticate } from './route/authenticate';


const logger = require('./util/logger')(__filename);
const webpackConfig = require('../webpack.config.js');

const FRONTEND_ROUTES = [
  '/',
  '/roster',
  '/character/:id',
  '/housing',
  '/admin',
  '/admin/account-logs',
  '/admin/citadels',
  '/admin/setup',
  '/admin/tasks',
  '/dev/',
  '/dev/:section',
];

export function init(db: Tnex, onServing: (port: number) => void) {
  let app = express();

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.use(cookieSession({
    name: 'session',
    secret: process.env.COOKIE_SECRET
  }));

  app.set('view engine', 'pug');
  app.set('views', './views');

  // Development serving
  if (isDevelopment()) {
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

  app.all('*', (req, res, next) => {
    req.db = db;
    next();
  });

  // For healthchecks
  app.get('/healthz', function(req, res) {
    res.send('ok');
  });

  // Includes root ('/')
  app.get(FRONTEND_ROUTES, route_home);

  app.get('/login', function(req, res) {
    res.render('login', {
      loginParams: LOGIN_PARAMS,
      backgroundUrl: Math.floor(Math.random() * 5) + '.jpg',
    });
  });

  app.get('/authenticate', route_authenticate);

  app.get('/logout', function(req, res) {
    endSession(req);
    res.redirect('/');
  });

  // Manually include the API routes defined in api/
  app.use('/api', route_api);

  // Mount the web panel provided by scribe but guard it with a privilege check
  app.use('/logs', (req, res, next) => {
    Promise.resolve()
    .then(() => {
      return getAccountPrivs(req.db, req.session.accountId);
    })
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
  let server = app.listen(port, () => {
    onServing(port);
  });
}
