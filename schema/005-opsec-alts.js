const Promise = require('bluebird');
const alterTable = require('./util/alterTable');
const migrate = require('./util/migrate');


exports.up = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return alterTable(
      trx,
      'ownership',
      table => {
        table.integer('character').primary().references('character.id');
        table.integer('account')
            .references('account.id').index().notNullable();
        table.boolean('opsec').notNullable();
      },
      ['character', 'account', '0'],
      ['character', 'account', 'opsec']
    );
  })
  .then(() => {
    return trx('privilege')
        .insert([
          {
            name: 'memberOpsecAlts',
            category: 'member',
            ownerLevel: 2,
            description: 'Alts that a member has marked as opsec.',
          },
          {
            name: 'characterIsOpsec',
            category: 'character',
            ownerLevel: 2,
            description: 'Whether an external character is "opsec" (see memberOpsecAlts).',
          },
        ]);
  })
  .then(() => {
    return trx('rolePriv')
        .insert({ role: 'admin', privilege: 'memberOpsecAlts', level: 2 });
  });
});

exports.down = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return alterTable(
      trx,
      'ownership',
      table => {
        table.integer('character').primary().references('character.id');
        table.integer('account')
            .references('account.id').index().notNullable();
      },
      ['character', 'account'],
      ['character', 'account']
    );
  })
  .then(() => {
    return trx('rolePriv')
        .del()
        .where('privilege', '=', 'memberOpsecAlts');
  })
  .then(() => {
    return trx('privilege')
        .del()
        .whereIn('name', ['memberOpsecAlts', 'characterIsOpsec']);
  });
});
