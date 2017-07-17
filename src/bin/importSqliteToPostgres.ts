import { inspect } from 'util';

import knex = require('knex');

import { getPostgresKnex } from '../db/getPostgresKnex';
import { getSqliteKnex } from '../db/getSqliteKnex';

import { serialize } from '../util/asyncUtil';


function main() {
  console.log(`Importing into postgres DB at "${process.env.DATABASE_URL}"...`);
  const sqlite = getSqliteKnex();
  const postgres = getPostgresKnex();

  migrateData(sqlite, postgres)
  .then(_ => {
    console.log('Migration complete.');
    process.exit(0);
  })
  .catch(e => {
    console.error('Error while migrating');
    console.error(e);
    process.exit(2);
  });
}

function migrateData(sqlite: knex, postgres: knex) {
  return Promise.resolve()
  .then(_ => {
    return postgres.transaction(trx => {
      return Promise.resolve()
      .then(_ => copyTable(sqlite, trx, 'character'))
      .then(_ => copyTable(sqlite, trx, 'citadel'))
      .then(_ => copyTable(sqlite, trx, 'memberCorporation'))
      .then(_ => copyTable(sqlite, trx, 'accessToken'))
      .then(_ => copyTable(sqlite, trx, 'account'))
      .then(_ => copyTable(sqlite, trx, 'accountGroup'))
      .then(_ => copyTable(sqlite, trx, 'accountLog'))
      .then(_ => copyTableIfExists(sqlite, trx, 'characterLocation'))
      .then(_ => copyTable(sqlite, trx, 'characterSkillQueue'))
      .then(_ => copyTable(sqlite, trx, 'cronLog'))
      .then(_ => copyTable(sqlite, trx, 'groupExplicit'))
      .then(_ => copyTable(sqlite, trx, 'groupTitle'))
      .then(_ => copyTable(sqlite, trx, 'killboard', row => {
        row.killValueInLastMonth = Math.round(row.killValueInLastMonth);
        row.lossValueInLastMonth = Math.round(row.lossValueInLastMonth);
        return row;
      }))
      .then(_ => copyTable(sqlite, trx, 'ownership'))
      .then(_ => copyTable(sqlite, trx, 'pendingOwnership'))
      .then(_ => copyTable(sqlite, trx, 'skillsheet'))

      // TODO: Can't just copy this, need to update
      .then(_ => updateTable(sqlite, trx, 'config', 'key', row => {
        if (row.key == 'rawServerConfig') {
          // This config value is never used
          return null;
        } else {
          return {
            key: row.key,
            value: row.value,
          };
        }
      }))

      .then(_ => resetNextCounter(trx, 'citadel', 'id'))
      .then(_ => resetNextCounter(trx, 'account', 'id'))
      .then(_ => resetNextCounter(trx, 'accountLog', 'id'))
      .then(_ => resetNextCounter(trx, 'cronLog', 'id'))
      .then(_ => resetNextCounter(trx, 'groupExplicit', 'id'))
      .then(_ => resetNextCounter(trx, 'groupTitle', 'id'))
    })
  })
}

function copyTable(
    sqlite: knex,
    postgres: knex,
    table: string,
    transformer?: (row: any) => any) {
  console.log(`Copying table "${table}"...`);
  return sqlite(table).select()
  .then(rows => {
    if (transformer) {
      rows = rows.map(transformer);
    }
    return batchInsert(postgres, table, rows)
  })
  .then(insertCount => {
    console.log(`  Inserted ${insertCount} rows.`);
  })
}

function copyTableIfExists(
    sqlite: knex,
    postgres: knex,
    table: string,
    transformer?: (row: any) => any) {
  return sqlite.raw(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [table])
  .then(rows => {
    if (rows.length > 0) {
      return copyTable(sqlite, postgres, table, transformer);
    } else {
      console.log(`Skipping copy of "${table}": table doesn't exist.`);
    }
  });
}

function updateTable(
    sqlite: knex,
    postgres: knex,
    table: string,
    primaryColumn: string,
    transformer?: (row: any) => any) {
  console.log(`Updating table "${table}"...`);
  return sqlite(table).select()
  .then(rows => {
    let rowUpdates = 0;
    if (transformer) {
      rows = rows.map(transformer);
    }
    return serialize(rows, (row: any) => {
      if (row != null) {
        let primaryVal = row[primaryColumn];
        if (primaryVal == undefined) {
          throw new Error(`No primary key "${primaryColumn}" defined for ` +
                  `row: ${inspect(row)}.`);
        }
        delete row[primaryColumn];
        return postgres(table)
            .update(row)
            .where(primaryColumn, '=', primaryVal)
        .then(updateCount => {
          if (updateCount != 1) {
            throw new Error(
                `Update failed for table "${table} on row "${primaryVal}".`);
          }
          rowUpdates++;
        })
      }
    })
    .then(() => {
      console.log(`   Updated ${rowUpdates} rows.`);
    });
  });
}

function resetNextCounter(knex: knex, table: string, column: string) {
  return knex.raw(
      `SELECT setval('??', (SELECT COALESCE(MAX(??), 0) FROM ??))`,
      [`${table}_${column}_seq`, column, table])
  .then(result => {
    console.log(
        `Next ${table}.${column} will start at ${result.rows[0].setval + 1}.`);
  });
}

const MAX_BATCH_SIZE = 1000;

function batchInsert(knex: knex, table: string, rows: any[]) {
  const rowCount = rows.length;
  return doNextBatch();

  function doNextBatch(): Promise<number> {
    let count = Math.min(MAX_BATCH_SIZE, rows.length);
    return Promise.resolve()
    .then(_ => {
      return knex(table).insert(rows.slice(0, count));
    })
    .then(_ => {
      rows = rows.slice(count);

      if (rows.length != 0) {
        return doNextBatch();
      } else {
        return rowCount;
      }
    })
  }
}

main();
