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
              (timestamp, account, event, relatedCharacter, data)
          SELECT timestamp, account, event, relatedCharacter, data
          FROM tmp`);
    })
    .then(() => {
      return knex('privilege')
          .insert([
            {
              name: 'adminConsole',
              category: 'admin',
              ownerLevel: 0,
              description: 'If an account can access the admin console.',
            },
            {
              name: 'accountLogs',
              category: 'admin',
              ownerLevel: 0,
              description: 'If an account can logs of account activity.',
            },
            {
              name: 'cronLogs',
              category: 'admin',
              ownerLevel: 0,
              description: 'If an account can read logs of cron activity.',
            }
          ]);
    })
    .then(() => {
      return knex('rolePriv')
          .insert([
            { role: 'admin', privilege: 'adminConsole', level: 2 },
            { role: 'admin', privilege: 'accountLogs', level: 2 },
            { role: 'admin', privilege: 'cronLogs', level: 2 }
          ]);
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
        table.integer('account').references('accound.id').index().notNullable();
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
              (timestamp, account, event, relatedCharacter, data)
          SELECT timestamp, account, event, relatedCharacter, data
          FROM tmp`);
    })
    .then(() => {
      return knex('privilege')
          .del()
          .whereIn('name', ['adminConsole', 'accountLogs', 'cronLogs']);
    })
    .then(() => {
      return knex('rolePriv')
          .del()
          .whereIn('privilege', ['adminConsole', 'accountLogs', 'cronLogs']);
    });
  });
};
