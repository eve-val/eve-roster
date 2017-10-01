import Promise = require('bluebird');
import moment = require('moment');

import { dao } from '../../dao';
import { default as esi } from '../../esi';
import { Tnex } from '../../tnex';
import { JobTracker } from '../Job';
import { isAnyEsiError } from '../../util/error';
import { isMissingCharError } from '../../util/error';
import { UNKNOWN_CORPORATION_ID } from '../../util/constants';
import { CORP_DOOMHEIM } from '../../shared/eveConstants';
import { serialize } from '../../util/asyncUtil';

const logger = require('../../util/logger')(__filename);

export function syncCorps(
    db: Tnex, job: JobTracker): Promise<void> {
  let completedCharacters = 0;

  return dao.character.getAllCharacterIds(db)
  .then(characterIds => {
    job.setProgress(0, undefined);

    let esiErrorCharacterIds: number[] = [];

    return serialize(characterIds, (characterId, i) => {
      return updateCorporation(db, characterId)
      .catch(isAnyEsiError, e => {
        esiErrorCharacterIds.push(characterId);
      })
      .then(() => {
        completedCharacters++;
        job.setProgress(completedCharacters / characterIds.length, undefined);
      });
    })
    .then(() => {
      if (esiErrorCharacterIds.length > 0) {
        job.warn(`syncCorps got ESI errors for ${esiErrorCharacterIds}.`);
      }
    });
  });
}

function updateCorporation(db: Tnex, characterId: number) {
  return Promise.resolve()
  .then(() => {
    return dao.character.updateCharacter(db, characterId, {
      character_corporationId: UNKNOWN_CORPORATION_ID,
    })
  })
  .then(() => {
    return esi.characters(characterId).info()
  })
  .then(character => {
    return dao.character.updateCharacter(db, characterId, {
      character_corporationId: character.corporation_id,
    });
  })
  .then(() => {
    logger.info('Updated character %s', characterId);
  })
  .catch(isMissingCharError, e => {
    return dao.character.updateCharacter(db, characterId, {
      character_corporationId: CORP_DOOMHEIM,
    })
  });
}
