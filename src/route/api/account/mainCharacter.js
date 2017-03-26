const _ = require('underscore');
const Promise = require('bluebird');

const dao = require('../../../dao');
const protectedEndpoint = require('../../../route-helper/protectedEndpoint');
const policy = require('../../../route-helper/policy');
const BadRequestError = require('../../../error/BadRequestError');
const UnauthorizedClientError = require('../../../error/UnauthorizedClientError');


module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  let newMainId;

  return Promise.resolve()
  .then(() => {
    let targetAccountId = req.params.id;
    let isOwner = targetAccountId == account.id;
    if (!isOwner) {
      throw new UnauthorizedClientError('Not the right owner.');
    }
    newMainId = req.body.characterId;
    if (!newMainId) {
      throw new BadRequestError('Invalid character id: ' + newMainId);
    }
    return dao.getAccountDetails(account.id);
  })
  .then(([row]) => {
    let created = row.created;
    if (!policy.canDesignateMain(created)) {
      throw new UnauthorizedClientError(`Account was created ${created}, ` +
                `which is outside this account's main designation window.`);
    }
    return dao.getCharactersOwnedByAccount(account.id);
  })
  .then(rows => {
    if (!_.findWhere(rows, { id: newMainId })) {
      throw new BadRequestError(
          `Account ${account.id} doesn't own character ${newMainId}`);
    }
    return dao.setAccountMain(account.id, newMainId);
  })
  .then(() => {
    return {};
  });
});
