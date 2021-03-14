import moment from 'moment';
import { getAccessToken } from '../data-source/accessToken/accessToken';
import { ESI_UNIVERSE_STRUCTURES_$structureId } from '../data-source/esi/endpoints';
import { fetchEsi } from '../data-source/esi/fetch/fetchEsi';
import {
  fetchEveNames,
  fetchPlayerStructureName,
} from '../data-source/esi/names';
import { dao } from '../db/dao';
import { CharacterShipRow } from '../db/dao/CharacterShipDao';
import { Tnex } from '../db/tnex';
import { Asset, fetchAssets, formatLocationFlag } from '../eve/assets';
import { buildLoggerFromFilename } from '../infra/logging/buildLogger';
import { JobLogger } from '../infra/taskrunner/Job';
import { Task } from '../infra/taskrunner/Task';
import { arrayToMap } from '../util/collections';

const logger = buildLoggerFromFilename(__filename);

export const syncShips: Task = {
  name: 'syncShips',
  displayName: "Sync ship reminders",
  description: "Searches for corp-owned ships in members' assets.",
  timeout: moment.duration(60, 'minutes').asMilliseconds(),
  executor,
};

async function findShips(
  characterId: number,
  token: string,
  assets: Asset[],
): Promise<CharacterShipRow[]> {
  const shipAssets = arrayToMap(
    assets.filter((asset) => !!asset.name), // TODO filter by name.
    'itemId',
  );

  const stationIds = new Set(
    Array.from(shipAssets.values())
      .filter((asset) => asset.locationType === 'station')
      .map((asset) => asset.locationId),
  );
  const station_names = await fetchEveNames(stationIds);
  let structure_names = new Map<number, string>();
  for (let x of stationIds) {
    structure_names.set(x, station_names[x]);
  }

  // TODO probably should traverse as high up as possible, and
  // use all assets for that, not just ships. Check after hangars
  // are dealt with.
  const structure_ids = new Set(
    Array.from(shipAssets.values())
      .filter(
        (asset) =>
          asset.locationType === 'item' &&
          asset.locationFlag === 'Hangar' && // TODO: corp hangars?
          !shipAssets.has(asset.locationId),
      )
      .map((asset) => asset.locationId),
  );
  for (let sid of structure_ids) {
    structure_names.set(sid, await fetchPlayerStructureName(sid, token));
  }

  function makeLocationName(locationId: number, locationFlag: string): string {
    let maybe_name = structure_names.get(locationId);
    if (maybe_name !== undefined) return maybe_name;
    let maybe_ship = shipAssets.get(locationId);
    if (maybe_ship === undefined) return 'unknown location';

    const ship_location = makeLocationName(
      maybe_ship.locationId,
      maybe_ship.locationFlag,
    );
    return (
      `${ship_location}, ${maybe_ship.name} ` +
      `(${maybe_ship.typeName}), ${formatLocationFlag(locationFlag)}`
    );
  }

  return Array.from(shipAssets.values()).map(
    (asset) =>
      <CharacterShipRow>{
        characterId: characterId,
        itemId: asset.itemId,
        typeId: asset.typeId,
        name: asset.name!,
        locationDescription: makeLocationName(
          asset.locationId,
          asset.locationFlag,
        ),
      },
  );
}

async function executor(db: Tnex, job: JobLogger) {
  job.setProgress(0, undefined);
  const characterIds = await dao.roster.getCharacterIdsOwnedByMemberAccounts(
    db,
  );
  const len = characterIds.length;
  let progress = 0;
  for (let characterId of characterIds) {
    const token = await getAccessToken(db, characterId);
    const assets = await fetchAssets(characterId, token, db);
    const ships = await findShips(characterId, token, assets);
    dao.characterShip.setCharacterShips(db, characterId, ships);
    ++progress;
    job.setProgress(progress / len, undefined);
  }
}
