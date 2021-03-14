/**
 * Adds a table to store corp-provided ships found in character assets.
 */
exports.up = async function(trx) {
  await trx.schema.createTable('characterShip', (table) => {
    table.increments('id');
    table
      .integer('character')
      .references('character.id')
      .notNullable()
      .index();
    table.bigInteger('itemId').notNullable();
    table.integer('typeId').notNullable();
    table.string('name').notNullable();
    table.string('locationDescription').notNullable();
  });
};

exports.down = async function(trx) {
  await trx.schema.dropTable('characterShip');
};
