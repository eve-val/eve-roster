import moment from "moment";
import { getAccessToken } from "../data-source/accessToken/accessToken";
import {
  ESI_UNIVERSE_STRUCTURES_$structureId
} from "../data-source/esi/endpoints";
import { fetchEsi } from "../data-source/esi/fetch/fetchEsi";
import { fetchEveNames } from "../data-source/esi/names";
import { dao } from "../db/dao";
import { Tnex } from "../db/tnex";
import { Asset, fetchAssets } from "../eve/assets";
import { buildLoggerFromFilename } from "../infra/logging/buildLogger";
import { JobLogger } from "../infra/taskrunner/Job";
import { Task } from "../infra/taskrunner/Task";
import { arrayToMap } from "../util/collections";

const logger = buildLoggerFromFilename(__filename);

export const syncShips: Task = {
  name: "syncShips",
  displayName: "Sync ships",
  description: "Updates all members' ships (TODO).",
  timeout: moment.duration(30, "minutes").asMilliseconds(),
  executor,
};

class Ship {
  constructor(
    readonly asset: Asset,
    readonly name: string,
    readonly locationName: string
  ) {}
}

async function findShips(
  characterId: number,
  token: string,
  assets: Asset[]
): Promise<Ship[]> {
  const ship_assets = arrayToMap(
    assets.filter((asset) => !!asset.name),
    "itemId"
  );

  const station_ids = new Set(
    Array.from(ship_assets.values())
      .filter((asset) => asset.locationType === "station")
      .map((asset) => asset.locationId)
  );
  const station_names = await fetchEveNames(station_ids);

  const structure_ids = new Set(
    Array.from(ship_assets.values())
      .filter(
        (asset) =>
          asset.locationType === "item" &&
          asset.locationFlag === "Hangar" && // TODO: corp hangars?
          !ship_assets.has(asset.locationId)
      )
      .map((asset) => asset.locationId)
  );
  let structure_names = new Map<number, string>();
  for (let sid of structure_ids) {
    // TODO probably needs to catch "not found" etc.
    const s_name = (
      await fetchEsi(ESI_UNIVERSE_STRUCTURES_$structureId, {
        structureId: sid,
        _token: token,
      })
    ).name;
    structure_names.set(sid, s_name);
  }
  for (let x of station_ids) {
    structure_names.set(x, station_names[x]);
  }

  function splitAndLower(s: string) {
    return s
      .replace(/([A-Z0-9])/g, " $1")
      .trim()
      .toLowerCase();
  }

  function makeLocationName(locationId: number, locationFlag: string): string {
    let maybe_name = structure_names.get(locationId);
    if (maybe_name !== undefined) return maybe_name;
    let maybe_ship = ship_assets.get(locationId);
    if (maybe_ship === undefined) return "unknown location";

    const ship_location = makeLocationName(
      maybe_ship.locationId,
      maybe_ship.locationFlag
    );
    return (
      `${ship_location}, ${maybe_ship.name} ` +
      `(${maybe_ship.typeName}), ${splitAndLower(locationFlag)}`
    );
  }

  return Array.from(ship_assets.values()).map(
    (asset) =>
      new Ship(
        asset,
        asset.name!,
        makeLocationName(asset.locationId, asset.locationFlag)
      )
  );
}

async function executor(db: Tnex, job: JobLogger) {
  job.setProgress(0, undefined);
  const characterIds = await dao.roster.getCharacterIdsOwnedByMemberAccounts(
    db
  );
  for (let characterId of characterIds) {
    const token = await getAccessToken(db, characterId);
    const assets = await fetchAssets(characterId, token, db);
    const ships = await findShips(characterId, token, assets);
    logger.info(JSON.stringify(ships, null, 2));
  }
}
