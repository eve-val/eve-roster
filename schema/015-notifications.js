/**
 * Adds a table to store corp-provided ships found in character assets,
 * and a privilege to access that table.
 */
exports.up = async function(trx) {
  await trx.schema.createTable('characterNotification', (table) => {
    table.increments('id');
    table.integer('character').notNullable();
    table.integer('senderId').notNullable();
    table.string('senderType').notNullable();
    table.string('text').notNullable().index();
    table.bigInteger('timestamp').notNullable().index();
    table.string('type').notNullable().index();
  });

  await trx.schema.createTable('characterNotificationUpdate', (table) => {
    table.integer('character').primary();
    table.bigInteger('timestamp').notNullable();
  });
};

exports.down = async function(trx) {
  await trx.schema.dropTable('characterNotificationUpdate');
  await trx.schema.dropTable('characterNotification');
};
