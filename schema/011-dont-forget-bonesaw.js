const Promise = require('bluebird');
const migrate = require('./util/migrate');


exports.up = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return trx('citadel')
        .insert(
          {
            name: 'BONESAW',
            type: 'Astrahus',
            allianceAccess: true,
            allianceOwned: true
          }
        );
  });
});

exports.down = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return trx('citadel')
        .del()
        .where('name', '=', 'BONESAW');
  });
});
