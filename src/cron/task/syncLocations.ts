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


export function syncLocations(job: JobTracker): Promise<ExecutorResult> {
  return dao.roster.getCharacterIdsOwnedByMemberAccounts(rootDb)
  .then(characterIds => {
    job.setProgress(0, undefined);
    logger.info(`syncLocation beginning for ${characterIds.length} characters.`);

    let noTokenCharacterIds: number[] = [];
    let esiErrorCharacterIds: number[] = [];
    let failedCharacterIds: number[] = []

    return Promise.each(characterIds, (characterId, i, len) => {
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
        job.setProgress(i / len, undefined);
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
      location_character: characterId,
      location_timestamp: Date.now(),
      location_shipName: shipResults.ship_name,
      location_shipTypeId: shipResults.ship_type_id,
      location_shipItemId: shipResults.ship_item_id,
      location_solarSystemId: locationResults.solar_system_id,
    };
  })
  .then(data => {
    return db.transaction(db => {
      return dao.location.put(db, data);
    });
  });
}
