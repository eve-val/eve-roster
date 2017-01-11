const _ = require('underscore');

const async = require('../util/async');
const CONFIG = require('../config-loader').load();


const primaryCorpIds = _.pluck(CONFIG.primaryCorporations, 'id');

const accountRoles = module.exports = {
  updateAll: function(dao) {
    return dao.builder('account')
        .select('account.id')
    .then(rows => {
      return async.serialize(rows, row => {
        return accountRoles.updateAccount(dao, row.id);
      });
    });
  },

  updateAccount: function(trx, accountId) {
    return trx.builder('account')
        .select(
            'character.id',
            'character.corporationId',
            'character.titles',
            'account.mainCharacter')
        .join('ownership', 'ownership.account', '=', 'account.id')
        .join('character', 'character.id', '=', 'ownership.character')
        .where('account.id', '=', accountId)
    .then(rows => {
      console.log('updateAccount, accountId =', accountId);
      let roles = [];
      for (let row of rows) {
        console.log('Checking char', row.id);
        if (row.id == row.mainCharacter) {
          if (!isPrimaryCorp(row.corporationId)) {
            console.log(  'Main char not in SOUND, stripping...');
            // Account is no longer a member: strip all roles
            roles = [];
            // TODO: Add a warning flag to account if any SOUND members still
            // present?
            break;
          } else {
            roles.push('__member');
          }
        }

        if (!isPrimaryCorp(row.corporationId)) {
          console.log('  Not in primary corp, skipping...');
          continue;
        }

        let titles = JSON.parse(row.titles || '[]');
        console.log('  titles:', titles);
        let titleMap = getTitleMap(row.corporationId);
        for (let title of titles) {
          let role = titleMap[title];
          if (role) {
            console.log(' adding role:', role);
            roles.push(role);
          }
        }
      }
      roles = _.uniq(roles);
      console.log('Final roles:', roles);

      return trx.setAccountRoles(accountId, roles);
    });
  },

};

function isPrimaryCorp(corpId) {
  return corpId != null && primaryCorpIds.indexOf(corpId) != -1;
}

function getTitleMap(corpId) {
  for (let corp of CONFIG.primaryCorporations) {
    if (corp.id == corpId) {
      return corp.titles;
    }
  }
  return null;
}



if (require.main == module) {
  accountRoles.updateAll()
  .then(function() {
    console.log('Done.');
  })
  .catch(function(e) {
    console.log(e);
  });
}
