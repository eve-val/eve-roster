const Promise = require('bluebird');
const migrate = require('./util/migrate');


exports.up = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return trx('privilege')
        .insert(
            {
              name: 'memberGroups',
              category: 'admin',
              ownerLevel: 0,
              requiresMembership: false,
              description: 'What ACL groups a member has.'
            }
        );
  })
  .then(() => {
    return trx('groupPriv')
        .insert(
          {
            group: 'admin',
            privilege: 'memberGroups',
            level: 2,
          }
        );
  });
});

exports.down = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return trx('groupPriv')
        .del()
        .where('privilege', '=', 'memberGroups');
  })
  .then(() => {
    return trx('privilege')
        .del()
        .where('name', '=', 'memberGroups');
  });
});
