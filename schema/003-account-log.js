const Promise = require('bluebird');
const migrate = require('./util/migrate');


exports.up = migrate(trx => {
  return Promise.resolve()
  .then(function() {
    return trx.schema.createTable('accountLog', (table) => {
      table.bigInteger('timestamp').index().notNullable();
      table.integer('account').references('account.id').index().notNullable();
      table.enum('event', [
        'CREATE_ACCOUNT',
        'OWN_CHARACTER',
        'DESIGNATE_MAIN',
        'MERGE_ACCOUNTS',
        'MODIFY_ROLES',
        'GAIN_MEMBERSHIP',
        'LOSE_MEMBERSHIP',
      ]).notNullable();
      table.integer('relatedCharacter').references('character.id').nullable();
      table.text('data').nullable();
    });
  });
});

exports.down = migrate(trx => {
  return Promise.resolve()
  .then(function() {
    return trx.schema.dropTable('accountLog');
  })
});
