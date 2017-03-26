const Promise = require('bluebird');
const migrate = require('./util/migrate');


// Creates the initial schema (the state of the DB schema when switching over to trx migrations).
// Makes tables: privilege, role, rolePriv, citadel, account, accountRole, character, ownership, accessToken
//   skillsheet, cronLog
exports.up = migrate(trx => {
  return Promise.resolve()
  .then(function() {
    return trx.schema.createTable('privilege', table => {
      table.string('name').primary();
      table.string('category').notNullable();
      // An account can gain access to a privilege it doesn't naturally
      // have if it "owns" the resource in question. This column
      // specifies its privilege level in that case.
      table.integer('ownerLevel').notNullable();
      table.text('description').notNullable();
    });
  })
  .then(function() {
    return trx.schema.createTable('role', table => {
      table.string('name').primary().notNullable();
    });
  })
  .then(function() {
    return trx.schema.createTable('rolePriv', table => {
      table.string('role')
        .index().references('role.name').notNullable();
      table.string('privilege')
        .index().references('privilege.name').notNullable();
      // 0 = none, 1 = read, 2 = write
      table.integer('level').notNullable();

      table.unique(['role', 'privilege']);
    });
  })
  .then(function() {
    // Citadels in J+
    // FIXME is it worth including the EVE ID of the citadel?
    return trx.schema.createTable('citadel', (table) => {
      table.increments('id');
      table.string('name').index();
      table.string('type').notNullable();
      table.boolean('allianceAccess').notNullable();
      table.boolean('allianceOwned').notNullable();
    });
  })
  .then(function() {
    return trx.schema.createTable('account', (table) => {
      table.increments('id');

      // In Unix millis
      table.bigInteger('created').notNullable();

      table.integer('mainCharacter')
        .references('character.id').nullable();

      table.enum('activeTimezone',
        ['US East', 'US Central', 'US West', 'EU', 'AU']).nullable();
      table.string('homeCitadel').nullable().references('citadel.id');
    });
  })
  .then(function() {
    return trx.schema.createTable('accountRole', (table) => {
      table.integer('account')
        .references('account.id').index().notNullable();
      table.string('role').references('role.name').notNullable();
    });
  })
  .then(function() {
    // Members - Data on all members and ex-members. Ex-members are
    // remembered so that alts that have not left SOUND can still be
    // represented (and warned about).
    return trx.schema.createTable('character', (table) => {
      table.integer('id').primary();
      table.string('name').notNullable();
      table.integer('corporationId').index();

      // Just a JSON array. Maybe this should be a table?
      table.string('titles').nullable();

      // In Unix millis
      table.bigInteger('startDate');
      table.bigInteger('logonDate');
      table.bigInteger('logoffDate');

      // From zKillboard
      table.integer('killsInLastMonth');
      table.integer('killValueInLastMonth');
      table.integer('lossesInLastMonth');
      table.integer('lossValueInLastMonth');

      // From Siggy
      table.integer('siggyScore');
    });
  })
  .then(function() {
    return trx.schema.createTable('ownership', (table) => {
      table.integer('character').primary().references('character.id');
      table.integer('account')
        .references('account.id').index().notNullable();
    });
  })
  .then(function() {
    return trx.schema.createTable('accessToken', (table) => {
      table.integer('character')
        .primary().references('character.id').notNullable();
      table.string('refreshToken').notNullable();
      table.string('accessToken').notNullable();
      table.bigInteger('accessTokenExpires').notNullable();
      table.boolean('needsUpdate').notNullable();
    });
  })
  .then(function() {
    return trx.schema.createTable('skillsheet', (table) => {
      table.integer('character')
        .references('character.id').index().notNullable();
      table.integer('skill').notNullable();
      table.integer('level').notNullable();
      table.integer('skillpoints').notNullable();

      table.unique(['character', 'skill']);
    });
  })
  .then(function() {
    return trx.schema.createTable('cronLog', (table) => {
      table.increments('id');
      table.string('task').index().notNullable();

      // Unix millis
      table.bigInteger('start').index().notNullable();
      table.bigInteger('end');

      table.enum('result',
        ['success', 'failure', 'partial', 'unknown']);
    });
  });
});

// Drops tables in the opposite order they were created
exports.down = migrate(trx => {
  return Promise.resolve()
  .then(function() {
    return trx.schema.dropTable('cronLog');
  })
  .then(function() {
    return trx.schema.dropTable('skillsheet');
  })
  .then(function() {
    return trx.schema.dropTable('accessToken');
  })
  .then(function() {
    return trx.schema.dropTable('ownership');
  })
  .then(function() {
    return trx.schema.dropTable('character');
  })
  .then(function() {
    return trx.schema.dropTable('accountRole');
  })
  .then(function() {
    return trx.schema.dropTable('account');
  })
  .then(function() {
    return trx.schema.dropTable('citadel');
  })
  .then(function() {
    return trx.schema.dropTable('rolePriv');
  })
  .then(function() {
    return trx.schema.dropTable('role');
  })
  .then(function() {
    return trx.schema.dropTable('privilege');
  });
});
