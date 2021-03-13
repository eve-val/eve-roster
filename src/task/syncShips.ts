import moment from 'moment';
import { getAccessToken } from '../data-source/accessToken/accessToken';
import { ESI_UNIVERSE_STRUCTURES_$structureId } from '../data-source/esi/endpoints';
import { fetchEsi } from '../data-source/esi/fetch/fetchEsi';
import {
  fetchEveNames,
  fetchPlayerStructureName,
} from '../data-source/esi/names';
import { dao } from '../db/dao';
import { Tnex } from '../db/tnex';
import { Asset, fetchAssets, formatLocationFlag } from '../eve/assets';
import { buildLoggerFromFilename } from '../infra/logging/buildLogger';
import { JobLogger } from '../infra/taskrunner/Job';
import { Task } from '../infra/taskrunner/Task';
import { arrayToMap } from '../util/collections';

const logger = buildLoggerFromFilename(__filename);

export const syncShips: Task = {
  name: 'syncShips',
  displayName: 'Sync ships',
  description: "Updates all members' ships (TODO).",
  timeout: moment.duration(30, 'minutes').asMilliseconds(),
  executor,
};

class Ship {
  constructor(
    readonly asset: Asset,
    readonly name: string,
    readonly locationName: string,
  ) {}
}

async function findShips(
  token: string,
  assets: Asset[],
): Promise<Ship[]> {
  const shipAssets = arrayToMap(
    assets.filter((asset) => !!asset.name),
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
      new Ship(
        asset,
        asset.name!,
        makeLocationName(asset.locationId, asset.locationFlag),
      ),
  );
}

async function executor(db: Tnex, job: JobLogger) {
  job.setProgress(0, undefined);
  const characterIds = await dao.roster.getCharacterIdsOwnedByMemberAccounts(
    db,
  );
  for (let characterId of characterIds) {
    const token = await getAccessToken(db, characterId);
    const assets = await fetchAssets(characterId, token, db);
    const ships = await findShips(token, assets);
    logger.info(JSON.stringify(ships, null, 2));
  }
}
