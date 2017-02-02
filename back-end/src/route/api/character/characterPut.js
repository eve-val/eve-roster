const dao = require('../../../dao');
const protectedEndpoint = require('../../../route-helper/protectedEndpoint');
const policy = require('../../../route-helper/policy');
const BadRequestError = require('../../../error/BadRequestError');

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
  console.log('setIsOpsec', account, characterId, isOpsec);
  isOpsec = !!isOpsec;

  return dao.getCharacterAndOwner(characterId, ['corporationId', 'account'])
  .then(([row]) => {
    if (!row) {
      throw new BadRequestError(`Character not found: ${characterId}.`);
    }

    privs.requireWrite('characterIsOpsec', account.id == row.account);

    if (isOpsec && policy.isAffiliatedCorp(row.corporationId)) {
      throw new BadRequestError(
          `Cannot set character ${characterId} to opsec: character is in an ` +
          `affiliated corp (${row.corporationId})`);
    }

    return dao.setCharacterIsOpsec(characterId, isOpsec);
  });
}
