import {
  ESI_CHARACTERS_$characterId_ASSETS,
  ESI_CHARACTERS_$characterId_ASSETS_NAMES,
} from "../data-source/esi/endpoints.js";
import { EsiAsset } from "../data-source/esi/EsiAsset.js";
import { fetchEsi, fetchEsiEx } from "../data-source/esi/fetch/fetchEsi.js";
import { dao } from "../db/dao.js";
import { SdeType } from "../db/tables.js";
import { Tnex } from "../db/tnex/index.js";
import { arrayToMap } from "../../shared/util/collections.js";
import { TYPE_CATEGORY_SHIP } from "./constants/categories.js";

const MAX_ASSET_PAGES_TO_FETCH = 50;

export type AssetLocationType = "station" | "solar_system" | "item" | "other";

export interface Asset {
  // Unique ID of this item.
  itemId: number;
  // Name, if this is an assembled ship. There are other named items in EVE,
  // but we currently don't bother fetching their names.
  name?: string;
  // Type of the item.
  typeId: number;
  typeCategory: number;
  typeName: string;
  // Is it stackable?
  isSingleton: boolean;
  // How many in this stack? 1 if not stackable.
  quantity: number;
  // ID of the location.
  locationId: number;
  // Type of the location; note that "item" may refer to an Upwell structure
  // or to a container item like a ship.
  locationType: AssetLocationType;
  // Where within a container the item is located; e.g. "Hangar" or "HiSlot3".
  locationFlag: string;
  // If this is a blueprint, is it a copy?
  isBlueprintCopy?: boolean;
}

/**
 * Reformats asset location flag to a human-readable form. E.g. "FleetHangar"
 * becomes "fleet hangar".
 */
export function formatLocationFlag(locationFlag: string): string {
  return locationFlag
    .replace(/([A-Z0-9])/g, " $1")
    .trim()
    .toLowerCase();
}

/** Retrieves assets for a given character from ESI. */
export async function fetchAssets(
  characterId: number,
  token: string,
  db: Tnex
): Promise<Asset[]> {
  const assets: EsiAsset[] = [];
  for (let page = 1; page <= MAX_ASSET_PAGES_TO_FETCH; page++) {
    const { data, pageCount } = await fetchEsiEx(
      ESI_CHARACTERS_$characterId_ASSETS,
      {
        characterId,
        page,
        _token: token,
      }
    );
    data.forEach((asset) => assets.push(asset));
    if (page >= pageCount) {
      break;
    }
  }

  const typeData = await fetchTypeData(assets, db);
  const shipNames = await fetchShipNames(assets, typeData, characterId, token);

  return assets.map((asset) => convertAsset(asset, typeData, shipNames));
}

async function fetchShipNames(
  assets: EsiAsset[],
  typeData: TypeDataMap,
  characterId: number,
  token: string
): Promise<Map<number, string>> {
  const itemIds = assets
    .filter((asset) => isAssembledShip(asset, typeData))
    .map((asset) => asset.item_id);
  const names = new Map<number, string>();
  for (const chunk of chunked(itemIds, 999)) {
    const batch = await fetchEsi(ESI_CHARACTERS_$characterId_ASSETS_NAMES, {
      characterId,
      _token: token,
      _body: chunk,
    });
    batch.forEach((t) => names.set(t.item_id, t.name));
  }
  return names;
}

type TypeData = Pick<SdeType, "styp_category" | "styp_name">;
type TypeDataMap = Map<number, TypeData>;

async function fetchTypeData(
  assets: EsiAsset[],
  db: Tnex
): Promise<TypeDataMap> {
  const typeIds = new Set<number>(assets.map((asset) => asset.type_id));
  const rows = await dao.sde.getTypes(db, Array.from(typeIds), [
    "styp_id",
    "styp_category",
    "styp_name",
  ]);

  const typeData: TypeDataMap = arrayToMap(rows, "styp_id");

  for (const tid of typeIds) {
    if (typeData.has(tid)) continue;
    // We don't import SDE data for many categories (e.g. SKINs). Assume we
    // don't care about these assets, and give them a dummy category and type
    // name.
    typeData.set(tid, { styp_category: 0, styp_name: "unknown" });
  }

  return typeData;
}

function isAssembledShip(a: EsiAsset, typeData: TypeDataMap): boolean {
  return (
    a.is_singleton &&
    typeData.get(a.type_id)!.styp_category === TYPE_CATEGORY_SHIP
  );
}

function convertAsset(
  a: EsiAsset,
  typeData: TypeDataMap,
  shipNames: Map<number, string>
): Asset {
  const td = typeData.get(a.type_id)!;
  return {
    itemId: a.item_id,
    name: shipNames.get(a.item_id),
    typeId: a.type_id,
    typeCategory: td.styp_category,
    typeName: td.styp_name,
    isSingleton: a.is_singleton,
    quantity: a.quantity,
    locationId: a.location_id,
    locationType: checkLocationType(a.location_type),
    locationFlag: a.location_flag,
    isBlueprintCopy: a.is_blueprint_copy,
  };
}

function checkLocationType(t: string): AssetLocationType {
  switch (t) {
    case "solar_system":
    case "item":
    case "station":
      return t;
    default:
      return "other";
  }
}

function* chunked(arr: number[], chunkSize: number) {
  for (let start = 0; start < arr.length; start += chunkSize) {
    yield arr.slice(start, start + chunkSize);
  }
}
