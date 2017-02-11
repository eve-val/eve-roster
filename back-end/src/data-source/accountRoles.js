const _ = require('underscore');

const asyncUtil = require('../util/asyncUtil');
const CONFIG = require('../config-loader').load();
const logger = require('../util/logger')(__filename);


const primaryCorpIds = _.pluck(CONFIG.primaryCorporations, 'id');
const MEMBER_ROLE = '__member';

const accountRoles = module.exports = {
  updateAll: function(dao) {
    return dao.builder('account')
        .select('account.id')
    .then(rows => {
      return asyncUtil.serialize(rows, row => {
        return accountRoles.updateAccount(dao, row.id);
      });
    });
  },

  updateAccount: function(dao, accountId) {
    return dao.builder('account')
        .select(
            'character.id',
            'character.corporationId',
            'character.titles',
            'account.mainCharacter')
        .join('ownership', 'ownership.account', '=', 'account.id')
        .join('character', 'character.id', '=', 'ownership.character')
        .where('account.id', '=', accountId)
    .then(rows => {
      logger.debug('updateAccount, accountId =', accountId);
      let roles = [];
      for (let row of rows) {
        logger.trace('Checking char', row.id);
        if (row.id == row.mainCharacter) {
          if (!isPrimaryCorp(row.corporationId)) {
            logger.trace(  'Main char not in SOUND, stripping...');
            // Account is no longer a member: strip all roles
            roles = [];
            // TODO: Add a warning flag to account if any SOUND members still
            // present?
            break;
          } else {
            roles.push(MEMBER_ROLE);
          }
        }

        if (!isPrimaryCorp(row.corporationId)) {
          logger.trace('  Not in primary corp, skipping...');
          continue;
        }

        let titles = JSON.parse(row.titles || '[]');
        logger.trace('  titles:', titles);
        let titleMap = getTitleMap(row.corporationId);
        for (let title of titles) {
          let role = titleMap[title];
          if (role) {
            logger.trace(' adding role:', role);
            roles.push(role);
          }
        }
      }
      roles = _.uniq(roles);
      logger.debug('Final roles:', roles);

      return setAccountRoles(dao, accountId, roles);
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

function setAccountRoles(dao, accountId, roles) {
  return dao.transaction(trx => {
    let oldRoles;
    roles.sort((a, b) => a.localeCompare(b));

    return trx.builder('accountRole')
        .select('role')
        .where('account', '=', accountId)
    .then(roles => {
      oldRoles = _.pluck(roles, 'role');
      return trx.builder('accountRole')
          .del()
          .where('account', '=', accountId)
    })
    .then(() => {
      if (roles.length > 0) {
        return trx.builder('accountRole')
            .insert(roles.map(role => ({ account: accountId, role: role }) ));
      }
    })
    .then(() => {
      if (!_.isEqual(oldRoles, roles)) {
        return trx.logEvent(accountId, 'MODIFY_ROLES', null, {
          old: oldRoles,
          new: roles,
        });
      }
    })
    .then(() => {
      if (!oldRoles.includes(MEMBER_ROLE) && roles.includes(MEMBER_ROLE)) {
        return trx.logEvent(accountId, 'GAIN_MEMBERSHIP');
      } else if (oldRoles.includes(MEMBER_ROLE) &&
          !roles.includes(MEMBER_ROLE)) {
        return trx.logEvent(accountId, 'LOSE_MEMBERSHIP');
      }
    });
  });
}



if (require.main == module) {
  accountRoles.updateAll()
  .then(function() {
    logger.info('Done.');
  })
  .catch(function(e) {
    logger.error(e);
  });
}
