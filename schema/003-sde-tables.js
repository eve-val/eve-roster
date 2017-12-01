
exports.up = async function(trx) {
  await trx.schema.createTable('sdeImport', table => {
    table.increments('id');

    table.string('md5').index().notNullable();
    table.integer('importerVersion').notNullable();
    table.bigInteger('timestamp').notNullable();
  });

  await trx.schema.createTable('sdeType', table => {
    table.integer('id').primary();
    table.integer('import').references('sdeImport.id').notNullable();

    table.string('name').notNullable();
    table.string('searchName').notNullable();
    table.integer('group').index().notNullable();
    table.integer('category').index().notNullable();
    table.text('description').notNullable();
    table.float('mass').notNullable();
    table.float('volume').notNullable();
    table.float('capacity').notNullable();
    table.integer('portionSize').notNullable();

    table.integer('race').nullable();
    table.decimal('basePrice', 19, 4).nullable();
    table.integer('marketGroup').nullable();
  })

  await trx.schema.createTable('sdeAttribute', table => {
    table.integer('id').primary();
    table.integer('import').references('sdeImport.id').notNullable();

    table.string('name').notNullable();
    table.text('description').notNullable();
    table.float('defaultValue').notNullable();

    table.integer('icon').nullable();
    table.string('displayName').nullable();
    table.integer('unit').nullable();
    table.integer('category').nullable();
    table.boolean('published').notNullable();
  });

  await trx.schema.createTable('sdeTypeAttribute', table => {
    table.integer('type').notNullable().index();
    table.integer('attribute').notNullable();
    table.integer('valueInt').nullable();
    table.float('valueFloat').nullable();
  });
}

exports.down = async function(trx) {
  await trx.schema.dropTable('sdeTypeAttribute');
  await trx.schema.dropTable('sdeAttribute');
  await trx.schema.dropTable('sdeType');
  await trx.schema.dropTable('sdeImport');
}
