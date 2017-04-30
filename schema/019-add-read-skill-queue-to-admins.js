const Promise = require('bluebird');
const migrate = require('./util/migrate');


exports.up = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return trx('groupPriv')
        .update({ level: 1 })
        .where('group', '=', 'admin')
        .andWhere('privilege', '=', 'characterSkillQueue');
  });
});

exports.down = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return trx('groupPriv')
        .update({ level: 0 })
        .where('group', '=', 'admin')
        .andWhere('privilege', '=', 'characterSkillQueue');
  });
});
