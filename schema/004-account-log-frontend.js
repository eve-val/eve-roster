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
      },
      ['timestamp', 'account', 'event', 'relatedCharacter', 'data'],
      ['timestamp', 'account', 'event', 'relatedCharacter', 'data']
    )
  })
  .then(() => {
    return trx('privilege')
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
    return trx('rolePriv')
        .insert([
          { role: 'admin', privilege: 'adminConsole', level: 2 },
          { role: 'admin', privilege: 'accountLogs', level: 2 },
          { role: 'admin', privilege: 'cronLogs', level: 2 }
        ]);
  })
});

exports.down = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return alterTable(
      trx,
      'accountLog',
      table => {
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
      },
      ['timestamp', 'account', 'event', 'relatedCharacter', 'data'],
      ['timestamp', 'account', 'event', 'relatedCharacter', 'data']
    )
  })
  .then(() => {
    return trx('rolePriv')
        .del()
        .whereIn('privilege', ['adminConsole', 'accountLogs', 'cronLogs']);
  })
  .then(() => {
    return trx('privilege')
        .del()
        .whereIn('name', ['adminConsole', 'accountLogs', 'cronLogs']);
  })
});
