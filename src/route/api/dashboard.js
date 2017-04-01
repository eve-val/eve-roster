const Promise = require('bluebird');

const moment = require('moment');

const dao = require('../../dao.js');
const getStub = require('../../route-helper/getStub');
const protectedEndpoint = require('../../route-helper/protectedEndpoint');
const policy = require('../../route-helper/policy');
const eve_sso = require('../../util/eve-sso.js');

module.exports = protectedEndpoint('json', function(req, res, account, privs) {
  let mainCharacter = null;
  let accountCreated = null;

  let characters = [];
  let access = null;

  return dao.getAccountDetails(account.id)
  .then(([row]) => {
    mainCharacter = row.mainCharacter;
    accountCreated = row.created;

    return dao.getCharactersOwnedByAccount(account.id, [
      'character.id',
      'character.name',
      'character.corporationId',
      'ownership.opsec',
      'accessToken.needsUpdate',
      'memberCorporation.membership'
    ])
  })
  .then(rows => {
    for (let row of rows) {
      characters.push({
        id: row.id,
        name: row.name,
        needsReauth: !!row.needsUpdate,
        opsec: !!row.opsec && privs.isMember(),
        corpStatus: getCorpStatus(row.membership),
      });
    }

    access = {
      "designateMain": policy.canDesignateMain(accountCreated) ? 2 : 0,
      isMember: privs.isMember(),
    };

    return dao.getPendingOwnership(account.id);
  })
  .then(rows => {
    const transfers = rows;

    return {
      accountId: account.id,
      characters: characters,
      transfers: transfers,
      loginParams: eve_sso.LOGIN_PARAMS,
      mainCharacter: mainCharacter,
      access: access,
    };
  });
});

function getCorpStatus(membership) {
  // TODO: Push this schema all the way down to the client and remove the need
  // for this transform
  switch (membership) {
    case 'full':
      return 'primary';
    case 'affiliated':
      return 'alt';
    default:
      return 'external';
  }
}
