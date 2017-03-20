const Promise = require('bluebird');
const alterTable = require('./util/alterTable');
const migrate = require('./util/migrate');


exports.up = migrate(trx => {
  return Promise.resolve()
  .then(() => trx.schema.renameTable('role', 'group'))
  .then(() => trx.schema.renameTable('rolePriv', 'groupPriv'))
  .then(() => trx.schema.renameTable('roleExplicit', 'groupExplicit'))
  .then(() => trx.schema.renameTable('roleTitle', 'groupTitle'))
  .then(() => trx.schema.renameTable('accountRole', 'accountGroup'))
  .then(() => {
    return alterTable(
        trx,
        'groupPriv',
        table => {
          table.string('group')
            .references('group.name')
            .index()
            .notNullable();
          table.string('privilege')
            .references('privilege.name')
            .index()
            .notNullable();
          table.integer('level').notNullable();

          table.unique(['group', 'privilege']);
        },
        ['role', 'privilege', 'level'],
        ['"group"', 'privilege', 'level']
    );
  })
  .then(() => {
    return alterTable(
        trx,
        'groupExplicit',
        table => {
          table.integer('id').primary();
          table.integer('account')
              .references('account.id')
              .index()
              .notNullable();
          table.string('group')
              .references('group.name')
              .notNullable();

          table.unique(['account', 'group']);
        },
        ['id', 'account', 'role'],
        ['id', 'account', '"group"']
    );
  })
  .then(() => {
    return alterTable(
        trx,
        'groupTitle',
        table => {
          table.integer('id').primary();
          table.integer('corporation')
              .references('memberCorporation.corporationId')
              .index()
              .notNullable();
          table.string('title').index().notNullable();
          table.string('group')
              .references('group.name')
              .notNullable();

          table.unique(['corporation', 'title', 'group']);
        },
        ['id', 'corporation', 'title', 'role'],
        ['id', 'corporation', 'title', '"group"']
    );
  })
  .then(() => {
    return alterTable(
        trx,
        'accountGroup',
        table => {
          table.integer('account')
              .references('account.id')
              .index()
              .notNullable();
          table.string('group')
              .references('group.name')
              .notNullable();
        },
        ['account', 'role'],
        ['account', '"group"']
    );
  })
  .then(() => {
    return trx('accountLog')
        .update({ event: 'MODIFY_GROUPS' })
        .where('event', '=', 'MODIFY_ROLES');
  })
});

exports.down = migrate(trx => {
  return Promise.resolve()
  .then(() => trx.schema.renameTable('group', 'role'))
  .then(() => trx.schema.renameTable('groupPriv', 'rolePriv'))
  .then(() => trx.schema.renameTable('groupExplicit', 'roleExplicit'))
  .then(() => trx.schema.renameTable('groupTitle', 'roleTitle'))
  .then(() => trx.schema.renameTable('accountGroup', 'accountRole'))
  .then(() => {
    return alterTable(
        trx,
        'rolePriv',
        table => {
          table.string('role')
            .index().references('role.name').notNullable();
          table.string('privilege')
            .index().references('privilege.name').notNullable();
          // 0 = none, 1 = read, 2 = write
          table.integer('level').notNullable();

          table.unique(['role', 'privilege']);
        },
        ['"group"', 'privilege', 'level'],
        ['role', 'privilege', 'level']
    );
  })
  .then(() => {
    return alterTable(
        trx,
        'roleExplicit',
        table => {
          table.integer('id').primary();
          table.integer('account')
              .references('account.id').index().notNullable();
          table.string('role').references('role.name').notNullable();

          table.unique(['account', 'role']);
        },
        ['id', 'account', '"group"'],
        ['id', 'account', 'role']
    );
  })
  .then(() => {
    return alterTable(
        trx,
        'roleTitle',
        table => {
          table.integer('id').primary();
          table.integer('corporation')
              .references('memberCorporation.corporationId')
              .index()
              .notNullable();
          table.string('title').index().notNullable();
          table.string('role').references('role.name').notNullable();

          table.unique(['corporation', 'title', 'role']);
        },
        ['id', 'corporation', 'title', '"group"'],
        ['id', 'corporation', 'title', 'role']
    );
  })
  .then(() => {
    return alterTable(
        trx,
        'accountRole',
        table => {
          table.integer('account')
              .references('account.id').index().notNullable();
          table.string('role').references('role.name').notNullable();
        },
        ['account', '"group"'],
        ['account', 'role']
    );
  })
  .then(() => {
    return trx('accountLog')
        .update({ event: 'MODIFY_ROLES' })
        .where('event', '=', 'MODIFY_GROUPS');
  })
});
