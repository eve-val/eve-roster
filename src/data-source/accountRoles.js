const _ = require('underscore');
const Promise = require('bluebird');

const asyncUtil = require('../util/asyncUtil');
const CONFIG = require('../config-loader').load();
const logger = require('../util/logger')(__filename);

const primaryCorpIds = _.pluck(CONFIG.primaryCorporations, 'id');
const ADMIN_ROLE = '__admin';
const MEMBER_ROLE = '__member';

const accountRoles = module.exports = {
  MEMBER_ROLE,
  ADMIN_ROLE,

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
    return Promise.resolve()
    .then(() => {
      return Promise.all([
        dao.getExplicitRoles(accountId),
        getCharacterDerivedRoles(dao, accountId),
      ]);
    })
    .then(([accountRoles, { roles: characterRoles, ownsAffiliatedChar }]) => {
      roles = _.uniq(accountRoles.concat(characterRoles));
      if (!roles.includes(MEMBER_ROLE) && !roles.includes(ADMIN_ROLE)) {
        logger.trace(  'Main char is not a member, stripping roles...');
        roles = [];
      }

      logger.debug(`updateAccount ${accountId}, roles= ${roles.join(', ')}`);
      if (!roles.includes(MEMBER_ROLE) && ownsAffiliatedChar) {
        // TODO: Flag the account somehow
      }
      return roles;
    })
    .then(roles => {
      return dao.setAccountRoles(accountId, roles);
    });
  },
};

function getCharacterDerivedRoles(dao, accountId) {
  return dao.getCharactersOwnedByAccount(accountId, [
      'character.id',
      'character.corporationId',
      'character.titles',
      'account.mainCharacter',
      'memberCorporation.membership'
  ])
  .then(characterRows => {
    return Promise.reduce(
        characterRows,
        getCharacterRoles,
        { dao, roles: [], ownsAffiliatedChar: false }
    );
  });
}

function getCharacterRoles({ dao, roles, ownsAffiliatedChar }, row) {
  if (row.id == row.mainCharacter && row.membership == 'full') {
    roles.push(MEMBER_ROLE);
  }
  if (row.membership == 'full' || row.membership == 'affiliated') {
    ownsAffiliatedChar = true;
  }

  let titles = JSON.parse(row.titles || '[]');
  return dao.getTitleRoles(row.corporationId, titles)
  .then(titleRoles => {
    roles.push(...titleRoles);

    return { dao, roles, ownsAffiliatedChar };
  });
}
