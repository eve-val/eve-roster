const Promise = require('bluebird');
const migrate = require('./util/migrate');


exports.up = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return trx.schema.createTable('location', table => {
      table.integer('character').references('character.id').index();
      table.bigInteger('timestamp').notNullable();
      table.string('shipName').notNullable();
      table.integer('shipTypeId').notNullable();
      table.integer('shipItemId').notNullable();
      table.integer('solarSystemId').notNullable();

      table.unique(['character', 'timestamp']);
    });
  });
});

exports.down = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return trx.schema.dropTable('location');
  })
});
