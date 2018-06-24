import { jsonEndpoint } from '../../../route-helper/protectedEndpoint';
import { dao } from '../../../dao';
import { findWhere } from '../../../util/underscore';
import { BadRequestError } from '../../../error/BadRequestError';
import { CORP_DOOMHEIM } from '../../../shared/eveConstants';

const logger = require('../../../util/logger')(__filename);


export default jsonEndpoint((req, res, db, account, privs): Promise<{}> => {
  let characterId = parseInt(req.params.id);
  logger.debug('deleteCharacter', account.id, characterId);


  return Promise.resolve()
  .then(() => {
    return dao.character.getCharactersOwnedByAccount(db, account.id);
  })
  .then(rows => {
    let row = findWhere(rows, { character_id: characterId });
    if (!row) {
      throw new BadRequestError(
          `Character not found or owned: ${characterId}.`);
    }
    if (row.character_corporationId != CORP_DOOMHEIM)  {
      throw new BadRequestError(
          `Cannot delete character ${characterId}: character is not biomassed`);
    }
    if (row.account_mainCharacter == characterId) {
      throw new BadRequestError(
          `Cannot delete character ${characterId}: is a main character.`);
    }

    return dao.character.updateCharacter(db, characterId, {
      character_deleted: true,
    })
  })
  .then(() => {
    return {};
  })
});
