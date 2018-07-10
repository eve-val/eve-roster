// Causes stack traces to reference the original .ts files
require('source-map-support').install();

require('heapdump');

import { tables } from './db/tables';
import { getPostgresKnex } from './db/getPostgresKnex';

import * as express from './infra/express/express';
import * as cron from './infra/taskrunner/cron';
import * as taskRunner from './infra/taskrunner/taskRunner';
import * as sde from './eve/sde';
import { buildLoggerFromFilename } from './infra/logging/buildLogger';

const logger = buildLoggerFromFilename(__filename);


const REQUIRED_VARS = [
  'COOKIE_SECRET',
  'SSO_CLIENT_ID',
  'SSO_SECRET_KEY'
];

// Crash the process in the face of an unhandled promise rejection
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled promise rejection`, err);
  throw err;
});

for (let envVar of REQUIRED_VARS) {
  if (!(envVar in process.env)) {
    logger.error(`Missing config param ${envVar} (check your .env file).`);
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

  taskRunner.init(db);
  cron.init(db);
  express.init(db, port => {
    logger.info(`Serving from port ${port}.`);
  });
}
