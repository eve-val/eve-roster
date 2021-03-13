import {
  ESI_CHARACTERS_$characterId_ASSETS,
  ESI_CHARACTERS_$characterId_ASSETS_NAMES,
} from "../data-source/esi/endpoints";
import { EsiAsset } from "../data-source/esi/EsiAsset";
import { fetchEsi, fetchEsiEx } from "../data-source/esi/fetch/fetchEsi";
import { dao } from "../db/dao";
import { SdeType } from "../db/tables";
import { Tnex } from "../db/tnex";
import { arrayToMap } from "../util/collections";
import { TYPE_CATEGORY_SHIP } from "./constants/categories";

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

export async function fetchAssets(
  characterId: number,
  token: string,
  db: Tnex
): Promise<Asset[]> {
  let assets: EsiAsset[] = [];
  for (let page = 1; true; page++) {
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
    .filter((asset) => isShip(asset, typeData))
    .map((asset) => asset.item_id);
  let names = new Map<number, string>();
  for (let chunk of chunked(itemIds, 999)) {
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
  const item_ids = new Set<number>(assets.map((asset) => asset.type_id));
  const rows = await dao.sde.getTypes(db, Array.from(item_ids), [
    "styp_id",
    "styp_category",
    "styp_name",
  ]);

  let data: TypeDataMap = arrayToMap(rows, "styp_id");

  // Set the default for types we couldn't find. This seems better than to
  // error out if our SDE dump is too old, and complicates downstream code
  // less than making type-related properties optional.
  for (let i of item_ids) {
    if (data.has(i)) continue;
    data.set(i, { styp_category: 0, styp_name: "" });
  }

  return data;
}

function isShip(a: EsiAsset, typeData: TypeDataMap): boolean {
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
