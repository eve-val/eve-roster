// Isolates DB initialization into one place.

const path = require('path');
const CONFIG = require('../config-loader').load();

const CLIENT = 'sqlite3';

let dbFile = CONFIG.dbFileName;
if (dbFile[0] != '/') {
  // A relative path, make it relative to back-end/
  dbFile = path.join(__dirname, '../../', dbFile);
}

const knex = require('knex')({
  client: CLIENT,
  debug: false,
  useNullAsDefault: true,
  connection: {
    filename: dbFile,
  }
});
knex.CLIENT = CLIENT;

module.exports = knex;