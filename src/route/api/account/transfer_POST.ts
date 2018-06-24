import { jsonEndpoint } from '../../../route-helper/protectedEndpoint';
import { dao } from '../../../dao';
import { idParam } from '../../../route-helper/paramVerifier';
import { verify, number } from '../../../route-helper/schemaVerifier';

import { BadRequestError } from '../../../error/BadRequestError';
import { UnauthorizedClientError } from '../../../error/UnauthorizedClientError';


export class Input {
  characterId = number();
}
export const inputSchema = new Input();

export default jsonEndpoint((req, res, db, account, privs) => {
  const accountParam = idParam(req, 'id');
  const input = verify(req.body, inputSchema);
  const charId = input.characterId;

  return Promise.resolve()
  .then(() => {
    if (accountParam != account.id) {
      throw new UnauthorizedClientError('Not the right owner.');
    }
    return dao.ownership.getPendingOwnership(db, account.id, charId);
  })
  .then(row => {
    if (row == undefined) {
      throw new BadRequestError(
          `No pending transfer found for account ${account.id} and`
              + ` character ${charId}`);
    }
    const newAccountId = account.id;
    const oldAccountId = row.ownership_account;
    return db.transaction(db => {
      return dao.log.logEvent(db, newAccountId, 'TRANSFER_CHARACTER', charId)
      .then(() => {
        if (oldAccountId != null) {
          return dao.ownership.deleteOwnership(
              db, charId, oldAccountId, newAccountId);
        }
      })
      .then(() => {
        return dao.ownership.ownCharacter(
            db, charId, newAccountId, row.pendingOwnership_ownerHash, false);
      })
      .then(() => {
        return dao.ownership.deletePendingOwnership(db, newAccountId, charId);
      });
    });
  })
  .then(() => ({}));
});

