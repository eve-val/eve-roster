import swagger from '../../swagger';
import { SimpleNumMap, nil, AsyncReturnType } from "../../util/simpleTypes";
import { isAnyEsiError, printError } from '../../util/error';
import { UNKNOWN_CORPORATION_ID } from '../../util/constants';
import { buildLoggerFromFilename } from '../../logs/buildLogger';

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
    let entries: AsyncReturnType<typeof swagger.names>;
    try {
      entries = await swagger.names(unresolvedIds.slice(i, end));
    } catch (e) {
      if (isAnyEsiError(e)) {
        logger.error('ESI error while fetching names for '
            + unresolvedIds.slice(i, end));
        logger.error(printError(e));
      }
      throw e;
    }
    i = end;

    for (let entry of entries) {
      NAME_CACHE.set(entry.id, entry.name);
      idMap[entry.id] = entry.name;
    }
  }

  return idMap;
}
