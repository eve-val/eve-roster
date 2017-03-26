const _ = require('underscore');
const Promise = require('bluebird');

const asyncUtil = require('../util/asyncUtil');
const logger = require('../util/logger')(__filename);
const specialGroups = require('../route-helper/specialGroups');

const ADMIN_GROUP = specialGroups.ADMIN_GROUP;
const MEMBER_GROUP = specialGroups.MEMBER_GROUP;

const accountGroups = module.exports = {
  updateAll: function(dao) {
    return dao.builder('account')
        .select('account.id')
    .then(rows => {
      return asyncUtil.serialize(rows, row => {
        return accountGroups.updateAccount(dao, row.id);
      });
    });
  },

  updateAccount: function(dao, accountId) {
    return Promise.resolve()
    .then(() => {
      return computeGroups(dao, accountId);
    })
    .then(({ groups, ownsAffiliatedChar }) => {
      if (!groups.includes(MEMBER_GROUP) && !groups.includes(ADMIN_GROUP)) {
        logger.trace(  'Main char is not a member, stripping groups...');
        groups = [];
      }

      logger.debug(`updateAccount ${accountId}, groups= ${groups.join(', ')}`);
      if (!groups.includes(MEMBER_GROUP) && ownsAffiliatedChar) {
        // TODO: Flag the account somehow
      }
      return groups;
    })
    .then(groups => {
      return dao.setAccountGroups(accountId, groups);
    });
  },
};

function computeGroups(dao, accountId) {
  return Promise.all([
    dao.getExplicitGroups(accountId),
    getGroupsDerivedFromCharacters(dao, accountId),
  ])
  .then(([
    accountGroups,
    [characterGroups, ownsAffiliatedChar]
  ]) => {
    return {
      groups: _.uniq(accountGroups.concat(characterGroups)),
      ownsAffiliatedChar,
    };
  })
}

function getGroupsDerivedFromCharacters(dao, accountId) {
  return dao.getCharactersOwnedByAccount(accountId, [
      'character.id',
      'character.corporationId',
      'character.titles',
      'account.mainCharacter',
      'memberCorporation.membership'
  ])
  .then(characterRows => {
    let groups = [];
    return Promise.reduce(
        characterRows,
        (ownsAffiliatedChar, row) => {
          return Promise.resolve()
          .then(() => {
            let titles = JSON.parse(row.titles || '[]');
            return dao.getTitleDerivedGroups(row.corporationId, titles)
          })
          .then(groupsFromTitles => {
            groups.push(...groupsFromTitles);

            if (row.id == row.mainCharacter && row.membership == 'full') {
              groups.push(MEMBER_GROUP);
            }
            if (row.membership == 'full' || row.membership == 'affiliated') {
              ownsAffiliatedChar = true;
            }

            return ownsAffiliatedChar;
          });
        },
        false
    )
    .then(ownsAffiliatedChar => {
      return [groups, ownsAffiliatedChar];
    });
  });
}