exports.up = function(knex, Promise) {
  return knex.transaction(trx => {
    return knex.raw('CREATE TEMPORARY TABLE tmp AS SELECT * FROM character')
    .then(() => {
      return knex.schema.dropTable('character');
    })
    .then(() => {
      return knex.schema.createTable('character', (table) => {
        table.integer('id').primary();
        table.string('name').notNullable();
        table.integer('corporationId').index();
        table.string('titles').nullable();
        table.bigInteger('startDate');
        table.bigInteger('logonDate');
        table.bigInteger('logoffDate');
        table.integer('siggyScore');
      });
    })
    .then(() => {
      return knex.raw(`
          INSERT INTO character
              (id, name, corporationId, titles, startDate, logonDate, logoffDate, siggyScore)
          SELECT id, name, corporationId, titles, startDate, logonDate, logoffDate, siggyScore
          FROM tmp`);
    })
    .then(() => {
      return knex.schema.createTable('killboard', (table) => {
        table.integer('character').primary().references('character.id');
        table.integer('killsInLastMonth');
        table.integer('killValueInLastMonth');
        table.integer('lossesInLastMonth');
        table.integer('lossValueInLastMonth');
        table.bigInteger('updated');
      });
    })
    .then(() => {
      return knex.raw(`
          INSERT INTO killboard
              (character, killsInLastMonth, killValueInLastMonth,
              lossesInLastMonth, lossValueInLastMonth, updated)
          SELECT id, killsInLastMonth, killValueInLastMonth, lossesInLastMonth,
              lossValueInLastMonth, 0
          FROM tmp`);
    })
    .then(() => {
      return knex.schema.dropTable('tmp');
    });
  });
};

exports.down = function(knex, Promise) {
  return knex.transaction(trx => {
    return knex.raw('CREATE TEMPORARY TABLE tmp AS SELECT * FROM character')
    .then(() => {
      return knex.schema.dropTable('character');
    })
    .then(() => {
      return knex.schema.createTable('character', (table) => {
        table.integer('id').primary();
        table.string('name').notNullable();
        table.integer('corporationId').index();
        table.string('titles').nullable();
        table.bigInteger('startDate');
        table.bigInteger('logonDate');
        table.bigInteger('logoffDate');
        table.integer('killsInLastMonth');
        table.integer('killValueInLastMonth');
        table.integer('lossesInLastMonth');
        table.integer('lossValueInLastMonth');
        table.integer('siggyScore');
      });
    })
    .then(() => {
      return knex.raw(`
          INSERT INTO character
              (id, name, corporationId, titles, siggyScore)
          SELECT id, name, corporationId, titles, siggyScore
          FROM tmp`);
    })
    .then(() => {
      return knex.schema.dropTable('killboard');
    })
    .then(() => {
      return knex.schema.dropTable('tmp');
    });
  });
};
