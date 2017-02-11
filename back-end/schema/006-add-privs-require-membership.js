exports.up = function(knex, Promise) {
  return knex.transaction(trx => {
    return knex.raw('CREATE TEMPORARY TABLE tmp AS SELECT * FROM privilege')
    .then(() => {
      return knex.schema.dropTable('privilege');
    })
    .then(() => {
      return knex.schema.createTable('privilege', (table) => {
        table.string('name').primary();
        table.string('category').notNullable();
        table.integer('ownerLevel').notNullable();
        table.boolean('requiresMembership').notNullable();
        table.text('description').notNullable();
      });
    })
    .then(() => {
      return knex.raw(`
          INSERT INTO privilege
              (name, category, ownerLevel, requiresMembership, description)
          SELECT name, category, ownerLevel, 1, description
          FROM tmp`);
    })
    .then(() => {
      return knex.schema.dropTable('tmp');
    })
    .then(() => {
      return knex('privilege')
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
      return knex('privilege')
          .del()
          .where('name', '=', 'memberExternalAlts');
    });
  });
};

exports.down = function(knex, Promise) {
  return knex.transaction(trx => {
    return knex.raw('CREATE TEMPORARY TABLE tmp AS SELECT * FROM privilege')
    .then(() => {
      return knex.schema.dropTable('privilege');
    })
    .then(() => {
      return knex.schema.createTable('privilege', (table) => {
        table.string('name').primary();
        table.string('category').notNullable();
        table.integer('ownerLevel').notNullable();
        table.text('description').notNullable();
      });
    })
    .then(() => {
      return knex.raw(`
          INSERT INTO privilege
              (name, category, ownerLevel, description)
          SELECT name, category, ownerLevel, description
          FROM tmp`);
    })
    .then(() => {
      return knex.schema.dropTable('tmp');
    })
    .then(() => {
      return knex('privilege')
          .insert([
            {
              name: 'memberExternalAlts',
              category: 'member',
              ownerLevel: 2,
              description: '[NOT IMPLEMENTED] What unaffiliated alts a member has. Requires "memberAlts".'
            },
          ]);
    });
  });
};
