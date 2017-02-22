const Promise = require('bluebird');

const dao = require('../../../dao');
const protectedEndpoint = require('../../../route-helper/protectedEndpoint');
const policy = require('../../../route-helper/policy');
const BadRequestError = require('../../../error/BadRequestError');
const logger = require('../../../util/logger')(__filename);

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  let characterId = req.params.id;

  return Promise.resolve()
  .then(() => {
    if (req.body.opsec != undefined) {
      return setIsOpsec(account, privs, characterId, req.body.opsec);
    }
  })
});

function setIsOpsec(account, privs, characterId, isOpsec) {
  logger.debug('setIsOpsec', account, characterId, isOpsec);
  isOpsec = !!isOpsec;

  return dao.getCharacterAndOwner(
      characterId,
      ['corporationId', 'account', 'membership'])
  .then(([row]) => {
    if (!row) {
      throw new BadRequestError(`Character not found: ${characterId}.`);
    }

    privs.requireWrite('characterIsOpsec', account.id == row.account);

    if (isOpsec && isMemberCorp(row.membership)) {
      throw new BadRequestError(
          `Cannot set character ${characterId} to opsec: character is in an ` +
          `affiliated corp (${row.corporationId})`);
    }

    return dao.setCharacterIsOpsec(characterId, isOpsec);
  });
}

function isMemberCorp(membership) {
  return membership == 'full' || membership == 'affiliated';
}
