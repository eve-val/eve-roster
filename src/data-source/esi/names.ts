import { SimpleNumMap, nil, AsyncReturnType } from "../../util/simpleTypes";
import { isAnyEsiError, printError } from './error';
import { UNKNOWN_CORPORATION_ID } from '../../db/constants';
import { buildLoggerFromFilename } from '../../infra/logging/buildLogger';
import { ESI_UNIVERSE_NAMES, ESI_UNIVERSE_STRUCTURES_$structureId } from './endpoints';
import { fetchEsi } from "./fetch/fetchEsi";

const logger = buildLoggerFromFilename(__filename);


const NAME_CACHE = new Map<number, string>();

/**
 * Fetches the names of a set of EVE entities (items, characters, alliances,
 * etc.). These names are cached indefinitely; subsequent queries will be
 * returned from the cache.
 */
export async function fetchEveNames(ids: Iterable<number | nil>) {
  const idMap: SimpleNumMap<string> = {};
  let unresolvedIds: number[] = [];
  for (let id of ids) {
    if (id == undefined || id == UNKNOWN_CORPORATION_ID) {
      continue;
    }

    let name = NAME_CACHE.get(id);
    if (name == undefined) {
      unresolvedIds.push(id);
    } else {
      idMap[id] = name;
    }
  }

  let i = 0;
  while (i < unresolvedIds.length) {
    let end = Math.min(unresolvedIds.length, i + 1000);
    let entries: typeof ESI_UNIVERSE_NAMES['response'] | null = null;
    try {
      entries = await fetchEsi(ESI_UNIVERSE_NAMES, {
        _body: unresolvedIds.slice(i, end),
      });
    } catch (e) {
      if (isAnyEsiError(e)) {
        logger.error('ESI error while fetching names for '
            + unresolvedIds.slice(i, end));
        logger.error(printError(e));
      }
    }
    i = end;

    if (entries) {
      for (let entry of entries) {
        NAME_CACHE.set(entry.id, entry.name);
        idMap[entry.id] = entry.name;
      }
    }
  }

  return idMap;
}

/**
 * Fetches the name of a player-owned structure given its ID, or gets it from
 * the cache if possible. These names may actually change, but we assume that
 * happens infrequently, and the old name is still useful for our purposes.
 *
 * Requires a token of an account on the ACL of this structure.
 */
export async function fetchPlayerStructureName(sid: number, token: string) {
  const name = NAME_CACHE.get(sid);
  if (name !== undefined) return name;
  const structureData = await fetchEsi(ESI_UNIVERSE_STRUCTURES_$structureId, {
    structureId: sid,
    _token: token,
  });
  NAME_CACHE.set(sid, structureData.name);
  return structureData.name;
}
