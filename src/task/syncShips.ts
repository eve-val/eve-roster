import moment from "moment";
import { getAccessToken } from "../data-source/accessToken/accessToken";
import {
  ESI_CHARACTERS_$characterId_ASSETS,
  ESI_CHARACTERS_$characterId_ASSETS_NAMES,
  ESI_UNIVERSE_STRUCTURES_$structureId,
} from "../data-source/esi/endpoints";
import { EsiAsset } from "../data-source/esi/EsiAsset";
import { fetchEsi, fetchEsiEx } from "../data-source/esi/fetch/fetchEsi";
import { fetchEveNames } from "../data-source/esi/names";
import { dao } from "../db/dao";
import { Tnex } from "../db/tnex";
import { TYPE_CATEGORY_SHIP } from "../eve/constants/categories";
import { buildLoggerFromFilename } from "../infra/logging/buildLogger";
import { JobLogger } from "../infra/taskrunner/Job";
import { Task } from "../infra/taskrunner/Task";

const logger = buildLoggerFromFilename(__filename);

export const syncShips: Task = {
  name: "syncShips",
  displayName: "Sync ships",
  description: "Updates all members' ships (TODO).",
  timeout: moment.duration(30, "minutes").asMilliseconds(),
  executor,
};

async function fetchAssets(characterId: number, token: string) {
  let assets: EsiAsset[] = [];
  for (let page = 1; true; page++) {
    const { data, page_count } = await fetchEsiEx(
      ESI_CHARACTERS_$characterId_ASSETS,
      {
        characterId,
        page,
        _token: token,
      }
    );
    data.forEach((asset) => assets.push(asset));
    if (page >= page_count) {
      break;
    }
  }
  return assets;
}

interface Asset extends EsiAsset {
  type_category: number;
  type_name: string;
}

async function fetchAssetTypeData(
  db: Tnex,
  assets: EsiAsset[]
): Promise<Asset[]> {
  const item_ids = new Set<number>(assets.map((asset) => asset.type_id));
  const rows = await dao.sde.getTypes(db, Array.from(item_ids), [
    "styp_id",
    "styp_category",
    "styp_name",
  ]);
  const type_data = new Map(rows.map((row) => [row.styp_id, row]));
  return assets.map((asset) => {
    const td = type_data.get(asset.type_id);
    if (!td) {
      return Object.assign(asset, {
        type_category: 0,
        type_name: "",
      });
    }
    return Object.assign(asset, {
      type_category: td.styp_category || 0,
      type_name: td.styp_name || "",
    });
  });
}

class Ship {
  constructor(
    readonly asset: Asset,
    readonly name: string,
    readonly location_name: string,
    readonly contents: Asset[]
  ) {}
}

async function findShips(
  characterId: number,
  token: string,
  assets: Asset[]
): Promise<Ship[]> {
  const ship_assets = new Map(
    assets
      .filter(
        (asset) =>
          asset.type_category == TYPE_CATEGORY_SHIP && asset.is_singleton
      )
      .map((asset) => [asset.item_id, asset])
  );
  const names = await fetchEsi(ESI_CHARACTERS_$characterId_ASSETS_NAMES, {
    characterId,
    _token: token,
    _body: Array.from(ship_assets.keys()),
  });
  const ship_names = new Map(names.map((r) => [r.item_id, r.name]));

  const station_ids = new Set(
    Array.from(ship_assets.values())
      .filter((asset) => asset.location_type === "station")
      .map((asset) => asset.location_id)
  );
  const station_names = await fetchEveNames(station_ids);

  const structure_ids = new Set(
    Array.from(ship_assets.values())
      .filter(
        (asset) =>
          asset.location_type === "item" &&
          asset.location_flag === "Hangar" &&
          !ship_names.has(asset.location_id)
      )
      .map((asset) => asset.location_id)
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
    return s.replace(/([A-Z])/g, " $1").trim().toLowerCase();
  }

  function findName(id: number, location_flag: string): string {
    let maybe_name = structure_names.get(id);
    if (maybe_name !== undefined) return maybe_name;
    let maybe_ship = ship_assets.get(id);
    if (maybe_ship === undefined) return "unknown location";

    const ship_location = findName(
      maybe_ship.location_id,
      maybe_ship.location_flag
    );
    const ship_name = ship_names.get(id) || "unnamed";
    return (
      `${ship_location}, ${ship_name} ` +
      `(${maybe_ship.type_name}), ${splitAndLower(location_flag)}`
    );
  }

  return Array.from(ship_assets.values()).map(
    (asset) =>
      new Ship(
        asset,
        ship_names.get(asset.item_id) || "",
        findName(asset.location_id, asset.location_flag),
        []
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
    const assets = await fetchAssets(characterId, token);
    const assets_with_type = await fetchAssetTypeData(db, assets);
    const ships = await findShips(characterId, token, assets_with_type);
    // const ships = assets_with_type.filter(
    //   (asset) => asset.type_category == TYPE_CATEGORY_SHIP
    // );
    // const ship_item_ids = ships.map((ship) => ship.item_id);
    // const names = await fetchEsi(ESI_CHARACTERS_$characterId_ASSETS_NAMES, {
    //   characterId,
    //   _token: token,
    //   _body: ship_item_ids,
    // });
    // const item_names = new Map(names.map((r) => [r.item_id, r.name]));
    // const ships_with_names = ships.map((s) =>
    //   Object.assign(s, { name: item_names.get(s.item_id) })
    // );
    logger.info(JSON.stringify(ships, null, 2));
  }
}
