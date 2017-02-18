exports.up = function(knex, Promise) {
  return knex.transaction(trx => {
    return knex.raw('CREATE TEMPORARY TABLE tmp AS SELECT * FROM ownership')
    .then(() => {
      return knex.schema.dropTable('ownership');
    })
    .then(() => {
      return knex.schema.createTable('ownership', (table) => {
        table.integer('character').primary().references('character.id');
        table.integer('account')
            .references('account.id').index().notNullable();
        table.boolean('opsec').notNullable();
      });
    })
    .then(() => {
      return knex.raw(`
          INSERT INTO ownership
              (character, account, opsec)
          SELECT character, account, 0
          FROM tmp`);
    })
    .then(() => {
      return knex.schema.dropTable('tmp');
    })
    .then(() => {
      return knex('privilege')
          .insert([
            {
              name: 'memberOpsecAlts',
              category: 'member',
              ownerLevel: 2,
              description: 'Alts that a member has marked as opsec.',
            },
            {
              name: 'characterIsOpsec',
              category: 'character',
              ownerLevel: 2,
              description: 'Whether an external character is "opsec" (see memberOpsecAlts).',
            },
          ]);
    })
    .then(() => {
      return knex('rolePriv')
          .insert([
            { role: 'admin', privilege: 'memberOpsecAlts', level: 2 },
          ]);
    });
  });
};

exports.down = function(knex, Promise) {
  return knex.transaction(trx => {
    return knex.raw('CREATE TEMPORARY TABLE tmp AS SELECT * FROM ownership')
    .then(() => {
      return knex.schema.dropTable('ownership');
    })
    .then(() => {
      return knex.schema.createTable('ownership', (table) => {
        table.integer('character').primary().references('character.id');
        table.integer('account')
            .references('account.id').index().notNullable();
      });
    })
    .then(() => {
      return knex.raw(`
          INSERT INTO ownership
              (character, account)
          SELECT character, account
          FROM tmp`);
    })
    .then(() => {
      return knex.schema.dropTable('tmp');
    })
    .then(() => {
      return knex('rolePriv')
          .del()
          .where('privilege', '=', 'memberOpsecAlts');
    })
    .then(() => {
      return knex('privilege')
          .del()
          .whereIn('name', ['memberOpsecAlts', 'characterIsOpsec']);
    });
  });
};
