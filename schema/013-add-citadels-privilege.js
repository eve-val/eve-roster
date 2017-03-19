exports.up = function(knex, Promise) {
  return Promise.resolve()
    .then(function() {
      return knex('privilege').insert([
        { name: 'citadels', category: 'admin', ownerLevel: 0, requiresMembership: false,
          description: 'Access to the list of citadels.' },
      ]);
    })
    .then(function() {
      return knex('rolePriv').insert([
        { role: 'admin', privilege: 'citadels', level: 2 },
        { role: 'full_member', privilege: 'citadels', level: 1 },
        { role: 'provisional_member', privilege: 'citadels', level: 1 },
      ]);
    })
};

exports.down = function(knex, Promise) {
  return Promise.resolve()
    .then(function() {
      return knex('rolePriv').del().where('privilege', '=', 'citadels');
    })
    .then(function() {
      return knex('privilege').del().where('name', '=', 'citadels');
    })
};
