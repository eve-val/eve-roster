const Promise = require('bluebird');
const migrate = require('./util/migrate');


exports.up = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return trx('privilege')
        .insert({
          name: 'serverLogs',
          category: 'admin',
          requiresMembership: true,
          ownerLevel: 0,
          description: 'If an account can read server console logs.',
        });
  })
  .then(() => {
    return trx('rolePriv')
        .insert({
          role: 'admin',
          privilege: 'serverLogs',
          level: 2
        });
  });
});

exports.down = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return trx('privilege')
        .del()
        .whereIn('name', ['serverLogs']);
  })
  .then(() => {
    return trx('rolePriv')
        .del()
        .whereIn('privilege', ['serverLogs']);
  });
});
