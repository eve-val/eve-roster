const Promise = require('bluebird');
const alterTable = require('./util/alterTable');
const migrate = require('./util/migrate');


exports.up = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return alterTable(
      trx,
      'accountLog',
      table => {
        table.increments('id');
        table.bigInteger('timestamp').index().notNullable();
        table.integer('account')
            .references('account.id').index().notNullable();
        table.integer('originalAccount').notNullable();
        table.enum('event', [
          'CREATE_ACCOUNT',
          'OWN_CHARACTER',
          'DESIGNATE_MAIN',
          'MERGE_ACCOUNTS',
          'MODIFY_ROLES',
          'GAIN_MEMBERSHIP',
          'LOSE_MEMBERSHIP',
        ]).notNullable();
        table.integer('relatedCharacter')
            .references('character.id').nullable();
        table.text('data').nullable();
      },
      ['id', 'timestamp', 'account', 'account'        , 'event',
          'relatedCharacter', 'data'],
      ['id', 'timestamp', 'account', 'originalAccount', 'event',
          'relatedCharacter', 'data']
    );
  })
});

exports.down = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return alterTable(
      trx,
      'accountLog',
      table => {
        table.increments('id');
        table.bigInteger('timestamp').index().notNullable();
        table.integer('account')
            .references('account.id').index().notNullable();
        table.integer('originalAccount').notNullable();
        table.enum('event', [
          'CREATE_ACCOUNT',
          'OWN_CHARACTER',
          'DESIGNATE_MAIN',
          'MERGE_ACCOUNTS',
          'MODIFY_ROLES',
          'GAIN_MEMBERSHIP',
          'LOSE_MEMBERSHIP',
        ]).notNullable();
        table.integer('relatedCharacter')
            .references('character.id').nullable();
        table.text('data').nullable();
      },
      ['id', 'timestamp', 'account', 'event', 'relatedCharacter', 'data'],
      ['id', 'timestamp', 'account', 'event', 'relatedCharacter', 'data']
    );
  })
});
