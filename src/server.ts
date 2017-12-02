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
import * as sde from './eve/sde';

const logger = require('./util/logger')(__filename);


const REQUIRED_VARS = [
  'COOKIE_SECRET',
  'SSO_CLIENT_ID',
  'SSO_SECRET_KEY'
];

for (let envVar of REQUIRED_VARS) {
  if (!(envVar in process.env)) {
    console.error(`Missing config param ${envVar} (check your .env file).`);
    process.exit(2);
  }
}

main()
.catch(e => {
  logger.error(`Fatal error during startup.`);
  logger.error(e);
  process.exit(2);
});

async function main() {
  const db = tables.build(getPostgresKnex());

  await sde.loadStaticData(db, false);

  tasks.init(new Scheduler(db));
  cron.init(db);
  express.init(db, port => {
    logger.info(`Serving from port ${port}.`);
  });  
}
