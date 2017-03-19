exports.up = function(knex, Promise) {
  return knex.transaction(trx => {
    return knex.raw('CREATE TEMPORARY TABLE tmp AS SELECT * FROM account')
    .then(() => {
      return knex.schema.dropTable('account');
    })
    .then(() => {
      return knex.schema.createTable('account', (table) => {
        table.increments('id');
        table.bigInteger('created').notNullable();
        table.integer('mainCharacter')
          .references('character.id').nullable();
        table.enum('activeTimezone',
          ['US East', 'US Central', 'US West', 'EU', 'AU']).nullable();
        table.string('homeCitadel').nullable()
          .references('citadel.id').onDelete('SET NULL');
      });
    })
    .then(() => {
      return knex.raw(`
          INSERT INTO account
              (id, created, mainCharacter, activeTimezone, homeCitadel)
          SELECT id, created, mainCharacter, activeTimezone, homeCitadel
          FROM tmp`);
    })
    .then(() => {
      return knex.schema.dropTable('tmp');
    });
  });
};

exports.down = function(knex, Promise) {
  return knex.transaction(trx => {
    return knex.raw('CREATE TEMPORARY TABLE tmp AS SELECT * FROM account')
    .then(() => {
      return knex.schema.dropTable('account');
    })
    .then(() => {
      return knex.schema.createTable('account', (table) => {
        table.increments('id');
        table.bigInteger('created').notNullable();
        table.integer('mainCharacter')
          .references('character.id').nullable();
        table.enum('activeTimezone',
          ['US East', 'US Central', 'US West', 'EU', 'AU']).nullable();
        table.string('homeCitadel').nullable().references('citadel.id');
      });
    })
    .then(() => {
      return knex.raw(`
          INSERT INTO account
              (id, created, mainCharacter, activeTimezone, homeCitadel)
          SELECT id, created, mainCharacter, activeTimezone, homeCitadel
          FROM tmp`);
    })
    .then(() => {
      return knex.schema.dropTable('tmp');
    });
  });
};
