const Promise = require('bluebird');

const dao = require('../../../dao');
const protectedEndpoint = require('../../../route-helper/protectedEndpoint');
const BadRequestError = require('../../../error/BadRequestError');
const UnauthorizedClientError = require('../../../error/UnauthorizedClientError');

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  let charId;

  return Promise.resolve()
  .then(() => {
    if (req.params.id != account.id) {
      throw new UnauthorizedClientError('Not the right owner.');
    }
    charId = req.body.characterId;
    if (!charId) {
      throw new BadRequestError('Invalid character id: ' + charId);
    }
    return (dao.builder('pendingOwnership')
           .select('ownership.account')
           .leftJoin('ownership', 'ownership.character', 'pendingOwnership.character')
           .where('pendingOwnership.account', account.id)
           .andWhere('pendingOwnership.character', charId))
  })
  .then(rows => {
    if (rows.length == 0) {
      throw new BadRequestError(`No pending transfer found for account
                                ${account.id} and character ${newMainId}`);
    }
    const newAccountId = account.id;
    const oldAccountId = rows[0].account;
    return dao.transaction(trx => {
      return trx.logEvent(newAccountId, 'TRANSFER_CHARACTER', charId)
      .then(() => trx.deleteOwnership(charId, oldAccountId, newAccountId))
      .then(() => trx.ownCharacter(charId, newAccountId))
      .then(() => trx.builder('pendingOwnership').del().where('character', charId));
    });
  })
  .then(() => ({}));
});
