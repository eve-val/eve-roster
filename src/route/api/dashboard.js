const Promise = require('bluebird');

const moment = require('moment');

const asyncUtil = require('../../util/asyncUtil');
const dao = require('../../dao.js');
const eve_sso = require('../../util/eve-sso.js');
const getStub = require('../../route-helper/getStub');
const protectedEndpoint = require('../../route-helper/protectedEndpoint');
const policy = require('../../route-helper/policy');
const skillQueueSummarizer = require('../../route-helper/skillQueueSummarizer');

module.exports = protectedEndpoint('json', function(req, res, account, privs) {
  let mainCharacter = null;

  let characters = [];
  let access = null;

  return dao.getAccountDetails(account.id)
  .then(([row]) => {
    mainCharacter = row.mainCharacter;

    access = {
      designateMain: policy.canDesignateMain(row.created) ? 2 : 0,
      isMember: privs.isMember(),
    };

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
    return asyncUtil.parallelize(rows, row => {
      return skillQueueSummarizer.fetchSkillQueueSummary(
          dao, row.id, 'cached')
      .then(queue => {
        return {
          id: row.id,
          name: row.name,
          needsReauth: !!row.needsUpdate,
          opsec: !!row.opsec && privs.isMember(),
          corpStatus: getCorpStatus(row.membership),
          skillQueue: queue,
        };
      });
    });
  })
  .then(_characters => {
    characters = _characters;

    return dao.getPendingOwnership(account.id);
  })
  .then(transfers => {
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
