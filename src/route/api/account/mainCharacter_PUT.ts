import Promise = require('bluebird');

import { jsonEndpoint } from '../../../route-helper/protectedEndpoint';
import { dao } from '../../../dao';
import { idParam } from '../../../route-helper/paramVerifier';
import { verify, number } from '../../../route-helper/schemaVerifier';
import { canDesignateMain } from '../../../route-helper/policy';
import { CORP_DOOMHEIM } from '../../../shared/eveConstants';

import { BadRequestError } from '../../../error/BadRequestError';
import { UnauthorizedClientError } from '../../../error/UnauthorizedClientError';


export class Input {
  characterId = number();
}
export const inputSchema = new Input();

export default jsonEndpoint((req, res, db, account, privs) => {
  const targetAccountId = idParam(req, 'id');
  const newMainId = verify(req.body, inputSchema).characterId;

  return Promise.resolve()
  .then(() => {
    let isOwner = targetAccountId == account.id;
    if (!isOwner) {
      throw new UnauthorizedClientError('Not the right owner.');
    }
    return dao.account.getDetails(db, account.id);
  })
  .then(row => {
    if (row == null) {
      throw new BadRequestError(`Cannot find account "${targetAccountId}".`);
    }

    let created = row.account_created;
    if (!canDesignateMain(created)) {
      throw new UnauthorizedClientError(
          `Account was created ${created}, which is outside this account's`
          + ` main designation window.`);
    }
    return dao.character.getCoreData(db, newMainId);
  })
  .then(charData => {
    if (charData == null) {
      throw new BadRequestError(`No such character: ${newMainId}.`);
    }
    if (charData.account_id != account.id) {
      throw new BadRequestError(
          `Account ${account.id} doesn't own character ${newMainId}`);
    }
    if (charData.character_corporationId == CORP_DOOMHEIM) {
      throw new BadRequestError(`Cannot set biomassed character as main.`);
    }

    return dao.account.setMain(db, account.id, newMainId);
  })
  .then(() => {
    return {};
  });
});
