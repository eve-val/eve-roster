const Promise = require('bluebird');
const alterTable = require('./util/alterTable');
const migrate = require('./util/migrate');


exports.up = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return alterTable(
      trx,
      'privilege',
      table => {
        table.string('name').primary();
        table.string('category').notNullable();
        table.integer('ownerLevel').notNullable();
        table.boolean('requiresMembership').notNullable();
        table.text('description').notNullable();
      },
      ['name', 'category', 'ownerLevel', '1',                  'description'],
      ['name', 'category', 'ownerLevel', 'requiresMembership', 'description']
    );
  })
  .then(() => {
    return trx('privilege')
        .update({ requiresMembership: false })
        .whereIn(
            'name',
            [
              'memberAlts',
              'memberOpsecAlts',
              'memberTimezone',
              'characterSkills',
              'characterSkillQueue',
            ]
        );
  })
  .then(() => {
    return trx('rolePriv')
        .del()
        .where('privilege', '=', 'memberExternalAlts');
  })
  .then(() => {
    return trx('privilege')
        .del()
        .where('name', '=', 'memberExternalAlts');
  });
});

exports.down = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return alterTable(
      trx,
      'privilege',
      table => {
        table.string('name').primary();
        table.string('category').notNullable();
        table.integer('ownerLevel').notNullable();
        table.text('description').notNullable();
      },
      ['name', 'category', 'ownerLevel', 'description'],
      ['name', 'category', 'ownerLevel', 'description']
    );
  })
  .then(() => {
    return trx('privilege')
        .insert({
          name: 'memberExternalAlts',
          category: 'member',
          ownerLevel: 2,
          description: '[NOT IMPLEMENTED] What unaffiliated alts a member has. Requires "memberAlts".'
        })
    .then(() => {
      return trx('rolePriv')
          .insert({
            role: 'admin',
            privilege: 'memberExternalAlts',
            level: 2,
          });
    })
  });
});
