const _ = require('underscore');

const dao = require('../../../dao');
const jsonEndpoint = require('../../../route-helper/jsonEndpoint');
const policy = require('../../../route-helper/policy');
const BadRequestError = require('../../../error/BadRequestError');
const UnauthorizedClientError = require('../../../error/UnauthorizedClientError');


module.exports = jsonEndpoint(function(req, res, accountId, privs) {
  let newMainId;

  return Promise.resolve()
  .then(() => {
    let targetAccountId = req.params.id;
    let isOwner = targetAccountId == accountId;
    if (!isOwner) {
      throw new UnauthorizedClientError('Not the right owner.');
    }
    newMainId = req.body.characterId;
    if (!newMainId) {
      throw new BadRequestError('Invalid character id: ' + newMainId);
    }
    return dao.getAccountDetails(accountId);
  })
  .then(([row]) => {
    let created = row.created;
    if (!policy.canDesignateMain(created)) {
      throw new UnauthorizedClientError(`Account was created ${created}, ` +
                `which is outside this account's main designation window.`);
    }
    return dao.getCharactersOwnedByAccount(accountId);
  })
  .then(rows => {
    if (!_.findWhere(rows, { id: newMainId })) {
      throw new BadRequestError(
          `Account ${accountId} doesn't own character ${newMainId}`);
    }
    return dao.setAccountMain(accountId, newMainId);
  })
  .then(() => {
    return {};
  });
});
