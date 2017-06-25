const Promise = require('bluebird');
const alterTable = require('./util/alterTable');
const migrate = require('./util/migrate');

const unknownCorpId = require('../out/util/constants').UNKNOWN_CORPORATION_ID;

const BASE_COLUMNS = [
  'id',
  'name',
  'titles',
  'startDate',
  'logonDate',
  'logoffDate',
  'siggyScore',
];

exports.up = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return alterTable(
        trx,
        'character',
        (table) => {
          table.integer('id').primary();
          table.string('name').notNullable();
          table.integer('corporationId').notNullable().index();
          table.string('titles').nullable();
          table.bigInteger('startDate');
          table.bigInteger('logonDate');
          table.bigInteger('logoffDate');
          table.integer('siggyScore');
        },
        BASE_COLUMNS.concat(
          `(CASE WHEN corporationId IS NULL 
             THEN ${unknownCorpId} 
             ELSE corporationId 
           END)`
        ),
        BASE_COLUMNS.concat('corporationId')
    )
  });
});

exports.down = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return alterTable(
        trx,
        'character',
        (table) => {
          table.integer('id').primary();
          table.string('name').notNullable();
          table.integer('corporationId').index();
          table.string('titles').nullable();
          table.bigInteger('startDate');
          table.bigInteger('logonDate');
          table.bigInteger('logoffDate');
          table.integer('siggyScore');
        },
        BASE_COLUMNS.concat(
            `(CASE WHEN corporationId = ${unknownCorpId} 
               THEN NULL 
               ELSE corporationId 
             END)`),
        BASE_COLUMNS.concat('corporationId')
    )
  });
});
