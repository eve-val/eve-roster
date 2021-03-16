/**
 * Adds a table to store corp-provided ships found in character assets,
 * and a privilege to access that table.
 */
exports.up = async function(trx) {
  await trx.schema.createTable('characterShip', (table) => {
    table.increments('id');
    table
      .integer('character')
      .notNullable()
      .index();
    table.bigInteger('itemId').notNullable();
    table.integer('typeId').notNullable();
    table.string('name').notNullable();
    table.string('locationDescription').notNullable();
  });

  await trx('privilege').insert([
    {
      name: 'characterShips',
      category: 'character',
      ownerLevel: 1,
      requiresMembership: false,
      description: 'Corp-owned ships in a character\'s assets.',
    },
  ]);

  await trx('groupPriv').insert([
    { group: 'admin', privilege: 'characterShips', level: 1 },
  ]);
};

exports.down = async function(trx) {
  await trx.schema.dropTable('characterShip');

  await trx('groupPriv')
    .del()
    .where('privilege', '=', 'characterShips');

  await trx('privilege')
    .del()
    .where('name', '=', 'characterShips');
};
