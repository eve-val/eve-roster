import Promise = require('bluebird');
import moment = require('moment');

import { getAccessTokenForCharacter } from '../../data-source/accessToken';
import { dao } from '../../dao';
import { default as esi } from '../../esi';
import { Tnex } from '../../tnex';
import { JobTracker } from '../Job';
import { MissingTokenError } from '../../error/MissingTokenError';
import { isAnyEsiError } from '../../util/error';

const logger = require('../../util/logger')(__filename);

const SLOW_UPDATE_THRESHOLD = moment.duration(30, 'days').asMilliseconds();
const RAPID_UPDATE_THRESHOLD = moment.duration(6, 'hours').asMilliseconds();


export function syncCharacterLocations(
    db: Tnex, job: JobTracker): Promise<void> {
  let completedCharacters = 0;

  return dao.roster.getCharacterIdsOwnedByMemberAccounts(db)
  .then(characterIds => {
    job.setProgress(0, undefined);

    let noTokenCharacterIds: number[] = [];
    let esiErrorCharacterIds: number[] = [];
    let failedCharacterIds: number[] = []

    return Promise.map(characterIds, (characterId, i, len) => {
      return maybeUpdateLocation(db, characterId)
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
}

function maybeUpdateLocation(db: Tnex, characterId: number) {
  return dao.characterLocation.getLatestTimestamp(db, characterId)
  .then(timestamp => {
    let staleness = timestamp ? (Date.now() - timestamp) : 0;
    if (staleness > SLOW_UPDATE_THRESHOLD) {
      // 100x slower average polling - do nothing 99% of the time.
      if (Math.random() > 0.01) { return; }
    } else if (staleness > RAPID_UPDATE_THRESHOLD) {
      // 10x slower average polling - do nothing 90% of the time.
      if (Math.random() > 0.1) { return; }
    }
    // Actually update the location
    return updateLocation(db, characterId);
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
