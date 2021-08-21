import pg from "pg";

import knex, { Knex } from "knex";

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

const CLIENT = "pg";

function getConnection(env: any) {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  } else if (
    env.DATABASE_HOST &&
    env.DATABASE_USER &&
    env.DATABASE_NAME &&
    env.DATABASE_PASS
  ) {
    return {
      host: env.DATABASE_HOST,
      user: env.DATABASE_USER,
      database: env.DATABASE_NAME,
      password: env.DATABASE_PASS,
    };
  } else {
    throw new Error(
      "DATABASE_URL (or DATABASE_{HOST,USER,NAME,PASS}) env var must be specified."
    );
  }
}

const CONFIG = {
  client: CLIENT,
  debug: false,
  connection: getConnection(process.env),
};

let pgKnex: Knex | null = null;

export function getPostgresKnex() {
  if (pgKnex == null) {
    pgKnex = knex(CONFIG);
    (pgKnex as any).CLIENT = CLIENT;
  }

  return pgKnex;
}
