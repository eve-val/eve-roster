import Bluebird = require('bluebird');
import moment = require('moment');

import { getAccessToken, getAccessTokens, getAccessTokensFromRows } from '../../data-source/accessToken';
import { dao } from '../../dao';
import swagger from '../../swagger';
import { Tnex, DEFAULT_NUM } from '../../tnex';
import { JobTracker } from '../Job';
import { AccessTokenError } from '../../error/AccessTokenError';
import { isAnyEsiError } from '../../util/error';
import { CharacterLocation } from '../../dao/tables';
import { cached } from 'sqlite3';

const logger = require('../../util/logger')(__filename);

const SLOW_UPDATE_THRESHOLD = moment.duration(30, 'days').asMilliseconds();
const RAPID_UPDATE_THRESHOLD = moment.duration(6, 'hours').asMilliseconds();

const CHARLOC_CACHE = new Map<number, CharacterLocation>();

export function syncCharacterLocations(
    db: Tnex, job: JobTracker): Bluebird<void> {

  return Bluebird.resolve(doTask(db, job));
}

async function doTask(db: Tnex, job: JobTracker) {
  if (CHARLOC_CACHE.size == 0) {
    await fillLocationCache(db);
  }

  const initialRows =
      await dao.characterLocation.getMemberCharactersWithValidAccessTokens(db);
  const tokenMap = await getAccessTokensFromRows(db, initialRows);

  const tasks: Promise<CharacterLocation | null>[] = [];
  for (let row of initialRows) {
    const tokenResult = tokenMap.get(row.accessToken_character)!;
    if (tokenResult.kind == 'error') {
      job.warn(
          `Error (${tokenResult.error}) while refreshing token for `
              + `${row.accessToken_character}.`);
      continue;
    }
    tasks.push(
        maybeUpdateLocation(row.accessToken_character, tokenResult.token)
        .catch(e => {
          job.error(
              `Error while updating location for `
                  + `${row.accessToken_character}:`);
          job.error(e);
          return null;
        }));
  }

  const results = await Promise.all(tasks);

  const updatedRows: CharacterLocation[] = [];
  for (let result of results) {
    if (result != null) {
      updatedRows.push(result);
    }
  }
  if (updatedRows.length > 0) {
    await dao.characterLocation.storeAll(db, updatedRows);
  }

  job.info(
      `Checked ${results.length} character locations; stored `
          + `${updatedRows.length} new locations`);
}

async function fillLocationCache(db: Tnex) {
  const rows =
      await dao.characterLocation.getMostRecentMemberCharacterLocations(db);

  for (let row of rows) {
    CHARLOC_CACHE.set(row.charloc_character, row);
  }
}

async function maybeUpdateLocation(characterId: number, accessToken: string) {
  let rowToCommit: CharacterLocation | null = null;

  const cachedRow = CHARLOC_CACHE.get(characterId) || null;
  if (shouldUpdateLocation(cachedRow)) {
    const newRow = await fetchUpdatedLocationRow(characterId, accessToken);

    if (cachedRow == null || !locationsEqual(cachedRow, newRow)) {
      CHARLOC_CACHE.set(characterId, newRow);
      rowToCommit = newRow;
    }
  }

  return rowToCommit;
}

function shouldUpdateLocation(cachedRow: CharacterLocation | null) {
  if (cachedRow == null) {
    return true;
  } else {
    let staleness = Date.now() - cachedRow.charloc_timestamp;
    if (staleness <= RAPID_UPDATE_THRESHOLD) {
      // Normal - always update.
      return true;
    } else if (staleness <= SLOW_UPDATE_THRESHOLD) {
      // 10x slower average polling - do nothing 90% of the time.
      return Math.random() <= 0.1;
    } else {
      // 100x slower average polling - do nothing 99% of the time.
      return Math.random() <= 0.01;
    }
  }
}

function locationsEqual(a: CharacterLocation, b: CharacterLocation) {
  return a.charloc_character == b.charloc_character
      && a.charloc_shipTypeId == b.charloc_shipTypeId
      && a.charloc_shipItemId == b.charloc_shipItemId
      && a.charloc_shipName == b.charloc_shipName
      && a.charloc_solarSystemId == b.charloc_solarSystemId;
}

async function fetchUpdatedLocationRow(
    characterId: number, accessToken: string,
): Promise<CharacterLocation> {
  const [locationResults, shipResults] = await Promise.all([
    swagger.characters(characterId, accessToken).location(),
    swagger.characters(characterId, accessToken).ship(),
  ]);

  return {
    charloc_character: characterId,
    charloc_timestamp: Date.now(),
    charloc_shipName: shipResults.ship_name,
    charloc_shipTypeId: shipResults.ship_type_id,
    charloc_shipItemId: shipResults.ship_item_id,
    charloc_solarSystemId: locationResults.solar_system_id,
  };
}
