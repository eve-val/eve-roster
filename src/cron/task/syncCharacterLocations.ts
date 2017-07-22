import Promise = require('bluebird');

import { getAccessTokenForCharacter } from '../../data-source/accessToken';
import { db as rootDb } from '../../db';
import { dao } from '../../dao';
import { default as esi } from '../../esi';
import { Tnex } from '../../tnex';
import { JobTracker, ExecutorResult } from '../Job';
import { MissingTokenError } from '../../error/MissingTokenError';
import { isAnyEsiError } from '../../util/error';

const logger = require('../../util/logger')(__filename);


export function syncCharacterLocations(
    job: JobTracker): Promise<ExecutorResult> {
  let completedCharacters = 0;

  return dao.roster.getCharacterIdsOwnedByMemberAccounts(rootDb)
  .then(characterIds => {
    job.setProgress(0, undefined);
    logger.info(`syncLocation beginning for ${characterIds.length} characters.`);

    let noTokenCharacterIds: number[] = [];
    let esiErrorCharacterIds: number[] = [];
    let failedCharacterIds: number[] = []

    return Promise.map(characterIds, (characterId, i, len) => {
      return updateLocation(rootDb, characterId)
      .catch(MissingTokenError, e => {
        noTokenCharacterIds.push(characterId);
      })
      .catch(isAnyEsiError, e => {
        esiErrorCharacterIds.push(characterId);
      })
      .catch(e => {
        failedCharacterIds.push(characterId);
      })
      .then(() => {
        completedCharacters++;
        job.setProgress(completedCharacters / len, undefined);
      });
    })
    .then(() => {
      if (noTokenCharacterIds.length > 0) {
        logger.warn(`syncLocation had no available token for ${noTokenCharacterIds}.`);
      }
      if (esiErrorCharacterIds.length > 0) {
        logger.warn(`syncLocation got ESI errors for ${esiErrorCharacterIds}.`);
      }
      if (failedCharacterIds.length > 0) {
        logger.warn(`syncLocation got errors for ${failedCharacterIds}.`);
      }
    });
  })
  .then((): ExecutorResult => {
    logger.info(`syncLocation finished for ${completedCharacters} characters.`);
    return 'success';
  });
}

function updateLocation(db: Tnex, characterId: number) {
  return getAccessTokenForCharacter(db, characterId)
  .then(accessToken => {
    return Promise.all([
      esi.characters(characterId, accessToken).location(),
      esi.characters(characterId, accessToken).ship(),
    ]);
  })
  .then(([locationResults, shipResults]) => {
    return {
      charloc_character: characterId,
      charloc_timestamp: Date.now(),
      charloc_shipName: shipResults.ship_name,
      charloc_shipTypeId: shipResults.ship_type_id,
      charloc_shipItemId: shipResults.ship_item_id,
      charloc_solarSystemId: locationResults.solar_system_id,
    };
  })
  .then(data => {
    return dao.characterLocation.put(db, data);
  });
}
