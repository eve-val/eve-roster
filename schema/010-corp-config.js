exports.up = function(knex, Promise) {
  return knex.transaction(trx => {
    return Promise.resolve()
    .then(() => {
      return knex.schema.createTable('memberCorporation', table => {
        table.integer('corporationId').primary();
        table.enum('membership', ['full', 'affiliated']).notNullable();
        table.integer('apiKeyId').nullable();
        table.string('apiVerificationCode').nullable();
      });
    })
    .then(() => {
      return knex.schema.createTable('roleTitle', table => {
        table.integer('id').primary();
        table.integer('corporation')
            .references('memberCorporation.id')
            .index()
            .notNullable();
        table.string('title').index().notNullable();
        table.string('role').references('role.name').notNullable();

        table.unique(['corporation', 'title', 'role']);
      });
    })
    .then(() => {
      return knex.schema.createTable('roleExplicit', table => {
        table.integer('id').primary();
        table.integer('account')
            .references('account.id').index().notNullable();
        table.string('role').references('role.name').notNullable();
      });
    })
    .then(() => {
      return knex.schema.createTable('config', table => {
        table.string('key').primary();
        table.text('value').nullable();
        table.text('description').nullable();
      });
    })
    .then(() => {
      return knex('role')
          .insert({
            name: '__admin',
          });
    })
    .then(() => {
      return knex('config')
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
};

exports.down = function(knex, Promise) {
  return knex.transaction(trx => {
    return Promise.resolve()
    .then(() => knex.schema.dropTable('roleExplicit'))
    .then(() => knex.schema.dropTable('roleTitle'))
    .then(() => knex.schema.dropTable('memberCorporation'))
    .then(() => knex.schema.dropTable('config'))
    .then(() => knex('role')
        .del()
        .where('name', '=', '__admin'))
  });
};
