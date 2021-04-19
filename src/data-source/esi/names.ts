import { SimpleNumMap, nil } from "../../util/simpleTypes";
import { isAnyEsiError, printError } from "./error";
import { UNKNOWN_CORPORATION_ID } from "../../db/constants";
import { buildLoggerFromFilename } from "../../infra/logging/buildLogger";
import { ESI_UNIVERSE_NAMES } from "./endpoints";
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
  const unresolvedIds: number[] = [];
  for (const id of ids) {
    if (id == undefined || id == UNKNOWN_CORPORATION_ID) {
      continue;
    }

    const name = NAME_CACHE.get(id);
    if (name == undefined) {
      unresolvedIds.push(id);
    } else {
      idMap[id] = name;
    }
  }

  let i = 0;
  while (i < unresolvedIds.length) {
    const end = Math.min(unresolvedIds.length, i + 1000);
    let entries: typeof ESI_UNIVERSE_NAMES["response"] | null = null;
    try {
      entries = await fetchEsi(ESI_UNIVERSE_NAMES, {
        _body: unresolvedIds.slice(i, end),
      });
    } catch (e) {
      if (isAnyEsiError(e)) {
        logger.error(
          "ESI error while fetching names for " + unresolvedIds.slice(i, end)
        );
        logger.error(printError(e));
      }
    }
    i = end;

    if (entries) {
      for (const entry of entries) {
        NAME_CACHE.set(entry.id, entry.name);
        idMap[entry.id] = entry.name;
      }
    }
  }

  return idMap;
}
