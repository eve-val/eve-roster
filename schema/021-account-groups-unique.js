const Promise = require('bluebird');
const alterTable = require('./util/alterTable');
const migrate = require('./util/migrate');

exports.up = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    // We have too many duplicates; might as well drop the entire table
    // and start over.
    return trx.schema.dropTable('accountGroup');
  })
  .then(() => {
    return trx.schema.createTable('accountGroup', table => {
      table.integer('account')
          .references('account.id')
          .index()
          .notNullable();
      table.string('group')
          .references('group.name')
          .notNullable();
      table.unique(['account', 'group']);
    });
  });
});

exports.down = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return trx.schema.dropTable('accountGroup');
  })
  .then(() => {
    return trx.schema.createTable('accountGroup', table => {
      table.integer('account')
          .references('account.id')
          .index()
          .notNullable();
      table.string('group')
          .references('group.name')
          .notNullable();
    });
  });
});
