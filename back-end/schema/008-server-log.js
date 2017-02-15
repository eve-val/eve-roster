exports.up = function(knex, Promise) {
  return knex.transaction(trx => {
    return knex('privilege')
    .insert([
      {
        name: 'serverLogs',
        category: 'admin',
        requiresMembership: true,
        ownerLevel: 0,
        description: 'If an account can read server console logs.',
      }
    ])
    .then(() => {
      return knex('rolePriv')
      .insert([
        {
          role: 'admin',
          privilege: 'serverLogs',
          level: 2
        }
      ]);
    });
  });
};

exports.down = function(knex, Promise) {
  return knex.transaction(trx => {
    return knex('privilege')
      .del()
      .whereIn('name', ['serverLogs'])
    .then(() => {
      return knex('rolePriv')
      .del()
      .whereIn('privilege', ['serverLogs']);
    });
  });
};
