import swagger from '../swagger';
import { SimpleNumMap, nil } from "../util/simpleTypes";


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
    if (id == undefined) {
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
    const entries = await swagger.names(unresolvedIds.slice(i, end));
    i = end;

    for (let entry of entries) {
      NAME_CACHE.set(entry.id, entry.name);
      idMap[entry.id] = entry.name;
    }
  }

  return idMap;
}
