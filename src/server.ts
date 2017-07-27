// Causes stack traces to reference the original .ts files
require('source-map-support').install();

require('heapdump');

import Promise = require('bluebird');

import { isDevelopment } from './util/config';
import { tables } from './dao/tables';
import { getPostgresKnex } from './db/getPostgresKnex';
import { Scheduler } from './cron/Scheduler';

import * as express from './express';
import * as cron from './cron/cron';
import * as tasks from './cron/tasks';

const logger = require('./util/logger')(__filename);


const REQUIRED_VARS = [
  'COOKIE_SECRET',
  'SSO_CLIENT_ID',
  'SSO_SECRET_KEY',
  'DB_FILE_NAME'
];

for (let envVar of REQUIRED_VARS) {
  if (!(envVar in process.env)) {
    console.error(`Missing config param ${envVar} (check your .env file).`);
    process.exit(2);
  }
}

const db = tables.build(getPostgresKnex());

let scheduler = new Scheduler(db);
tasks.init(scheduler);
cron.init(db);
express.init(db, port => {
  logger.info(`Serving from port ${port}.`);
});
