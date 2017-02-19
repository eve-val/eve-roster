exports.up = function(knex, Promise) {
  return knex.transaction(trx => {
    return knex.raw('CREATE TEMPORARY TABLE tmp AS SELECT * FROM accountLog')
    .then(() => {
      return knex.schema.dropTable('accountLog');
    })
    .then(() => {
      return knex.schema.createTable('accountLog', (table) => {
        table.increments('id');
        table.bigInteger('timestamp').index().notNullable();
        table.integer('account').references('accound.id').index().notNullable();
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
        table.integer('relatedCharacter').references('character.id').nullable();
        table.text('data').nullable();
      });
    })
    .then(() => {
      return knex.raw(`
          INSERT INTO accountLog
              (id, timestamp, account, originalAccount, event, relatedCharacter, data)
          SELECT id, timestamp, account, account, event, relatedCharacter, data
          FROM tmp`);
    })
    .then(() => {
      return knex.schema.dropTable('tmp');
    });
  });
};

exports.down = function(knex, Promise) {
  return knex.transaction(trx => {
    return knex.raw('CREATE TEMPORARY TABLE tmp AS SELECT * FROM accountLog')
    .then(() => {
      return knex.schema.dropTable('accountLog');
    })
    .then(() => {
      return knex.schema.createTable('accountLog', (table) => {
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
    })
    .then(() => {
      return knex.raw(`
          INSERT INTO accountLog
              (id, timestamp, account, event, relatedCharacter, data)
          SELECT id, timestamp, account, event, relatedCharacter, data
          FROM tmp`);
    })
    .then(() => {
      return knex.schema.dropTable('tmp');
    });
  });
};
