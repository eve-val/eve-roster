import Promise = require('bluebird');

import { jsonEndpoint } from '../../../route-helper/protectedEndpoint';
import { dao } from '../../../dao';
import { BadRequestError } from '../../../error/BadRequestError';
import { DOOMHEIM_ID } from '../../../util/constants';
const logger = require('../../../util/logger')(__filename);

export default jsonEndpoint((req, res, db, account, privs): Promise<{}> => {
  let characterId = parseInt(req.params.id);
  logger.debug('deleteCharacter', account.id, characterId);

  return dao.character.getCoreData(db, characterId)
  .then(row => {
    if (!row) {
      throw new BadRequestError(`Character not found: ${characterId}.`);
    }

    if (account.id != row.account_id) {
      throw new BadRequestError(`Account ${account.id} cannot delete character ${characterId}.`);
    }

    if (row.character_corporationId != DOOMHEIM_ID)  {
      throw new BadRequestError(
          `Cannot delete character ${characterId}: character is not biomassed`);
    }

    return dao.character.updateCharacter(db, characterId, {
      character_deleted: true,
    })
  });
});
