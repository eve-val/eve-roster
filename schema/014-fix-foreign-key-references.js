const Promise = require('bluebird');
const alterTable = require('./util/alterTable');
const migrate = require('./util/migrate');


exports.up = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    // Fix foreign reference: "accound.id" -> "account.id"
    return alterTable(
      trx,
      'accountLog',
      table => {
        table.increments('id');
        table.bigInteger('timestamp').index().notNullable();
        table.integer('account')
            .references('account.id').index().notNullable();
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
        table.integer('relatedCharacter')
            .references('character.id').nullable();
        table.text('data').nullable();
      },
      ['id', 'timestamp', 'account', 'originalAccount', 'event',
          'relatedCharacter', 'data'],
      ['id', 'timestamp', 'account', 'originalAccount', 'event',
          'relatedCharacter', 'data']
    );
  })
  .then(() => {
    // Fix foreign reference: "memberCorporation.id" -> ".corporationId"
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
      ['id', 'corporation', 'title', 'role'],
      ['id', 'corporation', 'title', 'role']
    );
  })
  .then(() => {
    return trx('rolePriv')
        .del()
        .where('privilege', '=', 'memberExternalAlts');
  })
  .then(() => {
    return trx('roleTitle')
        .update({
          role: 'provisional_member'
        })
        .where('role', '=', 'limited_member');
  });
});

exports.down = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return alterTable(
      trx,
      'accountLog',
      table => {
        table.increments('id');
        table.bigInteger('timestamp').index().notNullable();
        // Remove foreign key reference here
        table.integer('account').index().notNullable();
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
        table.integer('relatedCharacter')
            .references('character.id').nullable();
        table.text('data').nullable();
      },
      ['id', 'timestamp', 'account', 'originalAccount', 'event',
          'relatedCharacter', 'data'],
      ['id', 'timestamp', 'account', 'originalAccount', 'event',
          'relatedCharacter', 'data']
    );
  })
  .then(() => {
    return alterTable(
      trx,
      'roleTitle',
      table => {
        table.integer('id').primary();
        table.integer('corporation')
            // Drop foreign reference here
            .index()
            .notNullable();
        table.string('title').index().notNullable();
        table.string('role').references('role.name').notNullable();

        table.unique(['corporation', 'title', 'role']);
      },
      ['id', 'corporation', 'title', 'role'],
      ['id', 'corporation', 'title', 'role']
    );
  });
});
