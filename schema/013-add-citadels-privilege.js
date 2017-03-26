const Promise = require('bluebird');
const migrate = require('./util/migrate');


exports.up = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return trx('privilege')
        .insert(
            {
              name: 'citadels',
              category: 'admin',
              ownerLevel: 0,
              requiresMembership: false,
              description: 'Access to the list of citadels.'
            }
        );
  })
  .then(() => {
    return trx('rolePriv')
        .insert(
            [
              { role: 'admin', privilege: 'citadels', level: 2 },
              { role: 'full_member', privilege: 'citadels', level: 1 },
              { role: 'provisional_member', privilege: 'citadels', level: 1 },
            ]
        );
  });
});

exports.down = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return trx('rolePriv')
        .del()
        .where('privilege', '=', 'citadels');
  })
  .then(() => {
    return trx('privilege')
        .del()
        .where('name', '=', 'citadels');
  });
});
