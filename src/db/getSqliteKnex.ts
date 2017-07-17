import path = require('path');
import knex = require('knex');

const CLIENT = 'sqlite3';

let dbFile = process.env.DB_FILE_NAME;
if (dbFile[0] != '/') {
  // A relative path, make it relative to back-end/
  dbFile = path.join(__dirname, '../../', dbFile);
}

export function getSqliteKnex() {
  const sqliteKnex = knex({
    client: CLIENT,
    debug: false,
    useNullAsDefault: true,
    connection: {
      filename: dbFile,
    },
    pool: {
      afterCreate(conn: any, done: any) {
        // We must manually enable foreign key support for each SQLite
        // connection
        conn.run('PRAGMA foreign_keys = ON;', done);
      },
    },
  });
  (sqliteKnex as any).CLIENT = CLIENT;

  return sqliteKnex;
}
