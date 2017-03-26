const Promise = require('bluebird');
const asyncUtil = require('../../src/util/asyncUtil');


module.exports = function migrate(fn) {
  return function(knex) {
    let error = null;

    return Promise.resolve()
    .then(() => {
      return knex.raw('PRAGMA foreign_keys = OFF');
    })
    .then(() => {
      return runMigration(knex, fn)
      .catch(e => {
        error = e;
      });
    })
    .then(() => {
      return knex.raw('PRAGMA foreign_keys = ON');
    })
    .then(() => {
      if (error) {
        throw error;
      }
    });
  }
}

function runMigration(knex, fn) {
  return knex.transaction(trx => {
    return Promise.resolve()
    .then(() => {
      // Run the schema change
      return fn(trx);
    })
    .then(() => {
      // Check to see if we're violating any foreign keys. If so, print a
      // summary. This step is not necessary, but the usual error message
      // is completely opaque and unhepful.
      return trx.raw('PRAGMA foreign_key_check');
    })
    .then(rows => {
      if (rows.length > 0) {
        console.error('FATAL: Foreign key violation(s) detected.')
        return asyncUtil.serialize(rows, row => {
          return trx(row.table).select().where('rowid', '=', row.rowid)
          .then(sourceRows => {
            console.error('  Violation:', row);
            console.error('    Row:', sourceRows[0]);
          });
        })
        .then(() => {
          throw new Error('Foreign key violation(s) detected.');
        });
      }
    });
  });
}
