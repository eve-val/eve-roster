import moment from 'moment';
import { getAccessToken } from '../data-source/accessToken/accessToken';
import { ESI_UNIVERSE_STRUCTURES_$structureId } from '../data-source/esi/endpoints';
import { fetchEsi } from '../data-source/esi/fetch/fetchEsi';
import { fetchEveNames } from '../data-source/esi/names';
import { dao } from '../db/dao';
import { CharacterShipRow } from '../db/dao/CharacterShipDao';
import { Tnex } from '../db/tnex';
import { Asset, fetchAssets, formatLocationFlag } from '../eve/assets';
import { TYPE_CATEGORY_SHIP } from '../eve/constants/categories';
import { buildLoggerFromFilename } from '../infra/logging/buildLogger';
import { JobLogger } from '../infra/taskrunner/Job';
import { Task } from '../infra/taskrunner/Task';
import { arrayToMap } from '../util/collections';

const logger = buildLoggerFromFilename(__filename);

export const syncBorrowedShips: Task = {
  name: 'syncBorrowedShips',
  displayName: 'Sync borrowed ships',
  description: "Searches for corp-owned ships in members' assets.",
  timeout: moment.duration(60, 'minutes').asMilliseconds(),
  executor,
};

/**
 * Caches ID-to-name mapping for NPC stations and player structures. Station
 * IDs are already cached globally, but we are copying them to this cache for
 * consitency of access. Player structure names are mutable, so we only keep
 * this cache for the duration of a single sync.
 */
class LocationCache {
  private cache = new Map<number, string>();

  async cachePlayerStructure(sid: number, token: string) {
    const name = this.cache.get(sid);
    if (name !== undefined) return;
    const structureData = await fetchEsi(ESI_UNIVERSE_STRUCTURES_$structureId, {
      structureId: sid,
      _token: token,
    });
    this.cache.set(sid, structureData.name);
  }

  async cacheStations(ids: number[]) {
    const station_names = await fetchEveNames(ids);
    for (let x of ids) {
      this.cache.set(x, station_names[x]);
    }
  }

  get(x: number) {
    return this.cache.get(x);
  }
}

const CORP_OWNED_SHIP_NAME_PREFIX = 'SA ';

function isCorpShip(asset: Asset) {
  return (
    asset.typeCategory == TYPE_CATEGORY_SHIP &&
    asset.name &&
    asset.name.startsWith(CORP_OWNED_SHIP_NAME_PREFIX)
  );
}

/**
 * Asset itself, and the chain of the items that it's contained in, starting from the asset.
 */
class NestedAsset {
  readonly nesting: Asset[];

  constructor(asset: Asset, assetMap: Map<number, Asset>) {
    this.nesting = [asset];
    for (let it = asset; it.locationType === 'item'; ) {
      let next = assetMap.get(it.locationId);
      if (!next) break;
      this.nesting.push(next);
      it = next;
    }
  }

  get outermost() {
    return this.nesting[this.nesting.length - 1];
  }

  get asset() {
    return this.nesting[0];
  }

  get inStation() {
    return this.outermost.locationType === 'station';
  }

  get inPlayerStructure() {
    return (
      this.outermost.locationType === 'item' &&
      this.outermost.locationFlag === 'Hangar'
    );
  }

  get insideCorpShip() {
    return this.nesting.slice(1).some((asset) => isCorpShip(asset));
  }

  describeLocation(locCache: LocationCache) {
    let tokens = [];
    for (let i = 1; i < this.nesting.length; ++i) {
      const n = this.nesting[i];
      if (!n.name) continue;
      // Currently, if something has a name, then it's a ship, and its useful
      // to include its type and the "position" (e.g. fleet hangar) where the
      // asset is located. May be less useful for other named containers, if
      // we start fetching names for other assets.
      const flag = formatLocationFlag(this.nesting[i - 1].locationFlag);
      tokens.push(`${n.name} (${n.typeName}), ${flag}`);
    }
    const last = locCache.get(this.outermost.locationId);
    if (last !== undefined) {
      tokens.push(last);
    }
    if (!tokens.length) {
      return formatLocationFlag(this.asset.locationFlag);
    }
    tokens.reverse();
    return tokens.join(' > ');
  }
}

/**
 * Given the list of assets of a single character, finds the ships that look
 * like they might belong to the corp. To provide a useful description of the
 * locations of those ships, may need to retrieve station/structure names from
 * ESI. Uses location cache for that.
 */
async function findShips(
  characterId: number,
  token: string,
  assets: Asset[],
  locCache: LocationCache,
): Promise<CharacterShipRow[]> {
  const assetMap = arrayToMap(assets, 'itemId');
  const ships = assets
    .filter((asset) => isCorpShip(asset))
    .map((asset) => new NestedAsset(asset, assetMap))
    // No need to be noisy about a corp ship that's inside another
    // corp ship that we'll report anyway.
    .filter((asset) => !asset.insideCorpShip);

  const stationIds = new Set<number>();
  for (let s of ships) {
    if (s.inStation) {
      stationIds.add(s.outermost.locationId);
      continue;
    }
    if (s.inPlayerStructure) {
      await locCache.cachePlayerStructure(s.outermost.locationId, token);
    }
  }
  await locCache.cacheStations(Array.from(stationIds));

  return ships.map(
    (it) =>
      <CharacterShipRow>{
        characterId: characterId,
        itemId: it.asset.itemId,
        typeId: it.asset.typeId,
        name: it.asset.name!,
        locationDescription: it.describeLocation(locCache),
      },
  );
}

async function executor(db: Tnex, job: JobLogger) {
  job.setProgress(0, undefined);
  const characterIds = await dao.roster.getCharacterIdsOwnedByMemberAccounts(
    db,
  );
  const locCache = new LocationCache();
  const len = characterIds.length;
  let progress = 0;
  for (let characterId of characterIds) {
    const token = await getAccessToken(db, characterId);
    const assets = await fetchAssets(characterId, token, db);
    const ships = await findShips(characterId, token, assets, locCache);
    await dao.characterShip.setCharacterShips(db, characterId, ships);
    ++progress;
    job.setProgress(progress / len, undefined);
  }
}
