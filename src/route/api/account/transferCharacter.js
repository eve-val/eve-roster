const Promise = require('bluebird');

const accountRoles = require('../../../data-source/accountRoles');
const dao = require('../../../dao');
const protectedEndpoint = require('../../../route-helper/protectedEndpoint');
const BadRequestError = require('../../../error/BadRequestError');
const UnauthorizedClientError = require('../../../error/UnauthorizedClientError');

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  let charId;

  return Promise.resolve()
  .then(() => {
    const targetAccountId = req.params.id;
    const isOwner = targetAccountId == account.id;
    if (!isOwner) {
      throw new UnauthorizedClientError('Not the right owner.');
    }
    charId = req.body.characterId;
    if (!charId) {
      throw new BadRequestError('Invalid character id: ' + charId);
    }
    return dao.builder('pendingOwnership').select()
           .where('account', account.id)
           .andWhere('character', charId);
  })
  .then(rows => {
    if (rows.length == 0) {
      throw new BadRequestError(`No pending transfer found for account
                                ${accound.id} and character ${newMainId}`);
    }
    return dao.builder('ownership').select().where('character', charId);
  })
  .then (([row]) => { // row.account is the character's old account ID
    return dao.transaction(trx => {
      return trx.logEvent(account.id, 'TRANSFER_CHARACTER', charId)
      .then(() => trx.builder('ownership').del().where('character', charId))
      .then(() => trx.ownCharacter(charId, account.id))
      .then(() => trx.builder('pendingOwnership').del().where('character', charId))
      .then(() => accountRoles.updateAccount(trx, row.account))
      .then(() => trx.deleteAccountIfEmpty(row.account, account.id));
    });
  }).then(() => ({}));
});
