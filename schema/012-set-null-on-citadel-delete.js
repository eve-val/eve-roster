const Promise = require('bluebird');
const alterTable = require('./util/alterTable');
const migrate = require('./util/migrate');


exports.up = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return alterTable(
      trx,
      'account',
      table => {
        table.increments('id');
        table.bigInteger('created').notNullable();
        table.integer('mainCharacter')
            .references('character.id').nullable();
        table.enum('activeTimezone',
            ['US East', 'US Central', 'US West', 'EU', 'AU']).nullable();
        table.string('homeCitadel').nullable()
            .references('citadel.id').onDelete('SET NULL');
      },
      ['id', 'created', 'mainCharacter', 'activeTimezone', 'homeCitadel'],
      ['id', 'created', 'mainCharacter', 'activeTimezone', 'homeCitadel']
    )
  });
});

exports.down = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return alterTable(
      trx,
      'account',
      table => {
        table.increments('id');
        table.bigInteger('created').notNullable();
        table.integer('mainCharacter')
          .references('character.id').nullable();
        table.enum('activeTimezone',
          ['US East', 'US Central', 'US West', 'EU', 'AU']).nullable();
        table.string('homeCitadel').nullable().references('citadel.id');
      },
      ['id', 'created', 'mainCharacter', 'activeTimezone', 'homeCitadel'],
      ['id', 'created', 'mainCharacter', 'activeTimezone', 'homeCitadel']
    )
  });
});
