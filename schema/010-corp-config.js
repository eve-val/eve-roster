const Promise = require('bluebird');
const migrate = require('./util/migrate');


exports.up = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return trx.schema.createTable('memberCorporation', table => {
      table.integer('corporationId').primary();
      table.enum('membership', ['full', 'affiliated']).notNullable();
      table.integer('apiKeyId').nullable();
      table.string('apiVerificationCode').nullable();
    });
  })
  .then(() => {
    return trx.schema.createTable('roleTitle', table => {
      table.integer('id').primary();
      table.integer('corporation')
          .references('memberCorporation.corporationId')
          .index()
          .notNullable();
      table.string('title').index().notNullable();
      table.string('role').references('role.name').notNullable();

      table.unique(['corporation', 'title', 'role']);
    });
  })
  .then(() => {
    return trx.schema.createTable('roleExplicit', table => {
      table.integer('id').primary();
      table.integer('account')
          .references('account.id').index().notNullable();
      table.string('role').references('role.name').notNullable();
    });
  })
  .then(() => {
    return trx.schema.createTable('config', table => {
      table.string('key').primary();
      table.text('value').nullable();
      table.text('description').nullable();
    });
  })
  .then(() => {
    return trx('role')
        .insert({
          name: '__admin',
        });
  })
  .then(() => {
    return trx('config')
        .insert([{
          key: 'siggyUsername',
          value: null,
          description: 'Siggy username to use when scraping siggy stats.',
        }, {
          key: 'siggyPassword',
          value: null,
          description: null,
        }]);
  })
});

exports.down = migrate(trx => {
  return Promise.resolve()
  .then(() => trx.schema.dropTable('roleExplicit'))
  .then(() => trx.schema.dropTable('roleTitle'))
  .then(() => trx.schema.dropTable('memberCorporation'))
  .then(() => trx.schema.dropTable('config'))
  .then(() => trx('role')
      .del()
      .where('name', '=', '__admin'))
});
