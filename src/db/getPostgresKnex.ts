import pg = require('pg');
import knex = require('knex');


// By default, pg returns columns of type "bigint" (20) as strings, not numbers,
// since they could possibly overflow Javascript's number type (which is a
// double, not an int8). However, this makes dealing with our timestamps, which
// are unix millis, a huge pain in the butt. So instead we just guarantee that
// we'll never try to store a number that big.
// Note that unix milli timestamps are currently ~2^41 while doubles start to
// lose precision at 2^53.
// See https://github.com/brianc/node-postgres/pull/353
pg.types.setTypeParser(20, function (value) {
  return parseInt(value);
});

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL env var must be specified');
}

const CLIENT = 'pg';

const CONFIG = {
  client: CLIENT,
  debug: false,
  connection: process.env.DATABASE_URL,
};

export function getPostgresKnex() {
  const pgKnex = knex(CONFIG);
  (pgKnex as any).CLIENT = CLIENT;
  return pgKnex;
}
