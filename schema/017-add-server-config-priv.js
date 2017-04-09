const Promise = require('bluebird');
const migrate = require('./util/migrate');


exports.up = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return trx('privilege')
        .insert(
            {
              name: 'serverConfig',
              category: 'admin',
              ownerLevel: 0,
              requiresMembership: false,
              description: 'Access to the general server config file.'
            }
        );
  })
  .then(() => {
    return trx('groupPriv')
        .insert(
          {
            group: 'admin',
            privilege: 'serverConfig',
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
        .where('privilege', '=', 'serverConfig');
  })
  .then(() => {
    return trx('privilege')
        .del()
        .where('name', '=', 'serverConfig');
  });
});
