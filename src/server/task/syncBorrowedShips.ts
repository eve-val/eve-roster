import moment from "moment";
import { getAccessToken } from "../data-source/accessToken/accessToken.js";
import { ESI_UNIVERSE_STRUCTURES_$structureId } from "../data-source/esi/endpoints.js";
import { isAnyEsiError } from "../data-source/esi/error.js";
import { EsiErrorKind } from "../data-source/esi/EsiError.js";
import { fetchEsi } from "../data-source/esi/fetch/fetchEsi.js";
import { fetchEveNames } from "../data-source/esi/names.js";
import { dao } from "../db/dao.js";
import { CharacterShipRow } from "../db/dao/CharacterShipDao.js";
import { Tnex } from "../db/tnex/index.js";
import { AccessTokenError } from "../error/AccessTokenError.js";
import { Asset, fetchAssets, formatLocationFlag } from "../eve/assets.js";
import { TYPE_CATEGORY_SHIP } from "../eve/constants/categories.js";
import { fileURLToPath } from "url";
import { buildLoggerFromFilename } from "../infra/logging/buildLogger.js";
import { JobLogger } from "../infra/taskrunner/Job.js";
import { Task } from "../infra/taskrunner/Task.js";
import { arrayToMap } from "../../shared/util/collections.js";

// If a character was updated less than 10 minutes ago, we consider it
// unnecessary to update that character this time.
const MIN_UPDATE_FREQUENCY_MILLIS = 10 * 60 * 1000;

const CORP_OWNED_SHIP_NAME_PREFIX = "SA";

const ASSET_SAFETY_LOCATION_ID = 2004;

const logger = buildLoggerFromFilename(fileURLToPath(import.meta.url));

export const syncBorrowedShips: Task = {
  name: "syncBorrowedShips",
  displayName: "Sync borrowed ships",
  description: "Searches for corp-owned ships in members' assets.",
  timeout: moment.duration(30, "minutes").asMilliseconds(),
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

  constructor(private job: JobLogger) {
    this.cache.set(ASSET_SAFETY_LOCATION_ID, "Asset safety");
  }

  async cachePlayerStructures(token: string, ids: number[]) {
    for (const sid of ids) {
      const name = this.cache.get(sid);
      if (name !== undefined) continue;
      try {
        const structureData = await fetchEsi(
          ESI_UNIVERSE_STRUCTURES_$structureId,
          {
            structureId: sid,
            _token: token,
          }
        );
        this.cache.set(sid, structureData.name);
      } catch (e) {
        // If the character cannot access the structure, stop fetching names to
        // avoid running into ESI error limits.
        if (isAnyEsiError(e) && e.kind == EsiErrorKind.FORBIDDEN_ERROR) {
          logger.info(`unable to fetch location ${sid}: ${e.message}`);
          return;
        }
        // All other errors are unexpected, bubble them up.
        throw e;
      }
    }
  }

  async cacheStations(ids: number[]) {
    const station_names = await fetchEveNames(ids);
    for (const x of ids) {
      this.cache.set(x, station_names[x]);
    }
  }

  get(x: number) {
    return this.cache.get(x) || `Unknown citadel ${x}`;
  }
}

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
  private readonly nesting: Asset[];

  constructor(asset: Asset, assetMap: Map<number, Asset>) {
    this.nesting = [asset];
    for (let it = asset; it.locationType === "item"; ) {
      const next = assetMap.get(it.locationId);
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
    return this.outermost.locationType === "station";
  }

  get inPlayerStructure() {
    return (
      this.outermost.locationType === "item" &&
      this.outermost.locationFlag === "Hangar"
    );
  }

  get insideCorpShip() {
    return this.nesting.slice(1).some((asset) => isCorpShip(asset));
  }

  describeLocation(locCache: LocationCache) {
    const tokens = [];
    for (let i = 1; i < this.nesting.length; ++i) {
      const n = this.nesting[i];
      if (!n.name) continue;
      // Currently, if something has a name, then it's a ship, and it's useful
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
    return tokens.join(" > ");
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
  locCache: LocationCache
): Promise<CharacterShipRow[]> {
  const assetMap = arrayToMap(assets, "itemId");
  const ships = assets
    .filter((asset) => isCorpShip(asset))
    .map((asset) => new NestedAsset(asset, assetMap))
    // No need to be noisy about a corp ship that's inside another
    // corp ship that we'll report anyway.
    .filter((asset) => !asset.insideCorpShip);

  const stationIds = new Set<number>();
  const structureIds = new Set<number>();
  for (const s of ships) {
    if (s.inStation) {
      stationIds.add(s.outermost.locationId);
    } else if (s.inPlayerStructure) {
      structureIds.add(s.outermost.locationId);
    }
  }
  await locCache.cacheStations(Array.from(stationIds));
  await locCache.cachePlayerStructures(token, Array.from(structureIds));

  return ships.map(
    (it) =>
      <CharacterShipRow>{
        characterId: characterId,
        itemId: it.asset.itemId,
        typeId: it.asset.typeId,
        name: it.asset.name!,
        locationDescription: it.describeLocation(locCache),
      }
  );
}

async function updateCharacter(
  db: Tnex,
  locCache: LocationCache,
  characterId: number
) {
  const lastUpdated = await dao.characterShip.getLastUpdateTimestamp(
    db,
    characterId
  );
  const updateNeededCutoff = new Date().getTime() - MIN_UPDATE_FREQUENCY_MILLIS;
  if (lastUpdated > updateNeededCutoff) {
    return;
  }
  const token = await getAccessToken(db, characterId);
  const assets = await fetchAssets(characterId, token, db);
  const ships = await findShips(characterId, token, assets, locCache);
  await dao.characterShip.setCharacterShips(db, characterId, ships);
}

async function executor(db: Tnex, job: JobLogger) {
  job.setProgress(0, undefined);
  const characterIds = await dao.roster.getCharacterIdsOwnedByMemberAccounts(
    db
  );
  const locCache = new LocationCache(job);
  const len = characterIds.length;
  let progress = 0;
  let errors = 0;
  for (const characterId of characterIds) {
    try {
      await updateCharacter(db, locCache, characterId);
    } catch (e) {
      if (e instanceof AccessTokenError) {
        logger.info(
          `Access token error while fetching ships for char ${characterId}.`,
          e
        );
      } else if (isAnyEsiError(e)) {
        if (e.kind == EsiErrorKind.FORBIDDEN_ERROR) {
          logger.info(
            `Marking access token as invalid for char ${characterId} due to 403.`
          );
          dao.accessToken.markAsInvalid(db, characterId);
        }
        if (e.kind == EsiErrorKind.INTERNAL_SERVER_ERROR) {
          // Don't consider ISEs to be noteworthy failures on our side
          logger.info(
            `ESI server error while fetching ships for char ${characterId}.`,
            e
          );
        } else {
          ++errors;
          logger.warn(
            `ESI error while fetching ships for char ${characterId}.`,
            e
          );
        }
      } else {
        ++errors;
        throw e;
      }
    }
    ++progress;
    job.setProgress(progress / len, undefined);
  }
  if (errors) {
    job.warn(`Failed to fetch ships for ${errors}/${len} chars.`);
  }
}
