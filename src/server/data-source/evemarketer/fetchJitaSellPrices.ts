import moment from "moment";

import { ExpirationCache } from "../../util/ExpirationCache.js";
import { fetchMarketStats } from "./fetchMarketStats.js";
import {
  REGION_THE_FORGE,
  SYSTEM_JITA,
} from "../../eve/constants/mapSolarSystems.js";

const CACHE = new ExpirationCache<number, number>();
const CACHE_DURATION = moment.duration(4, "hours").asMilliseconds();

/**
 * Given a list of type IDs, looks up their current sell price in Jita.
 * These entries are cached for up to four hours.
 *
 * Returns a map of IDs to sell prices. May return an incomplete or empty map
 * if the network request to the data source fails.
 */
export async function fetchJitaSellPrices(ids: number[]) {
  const out = new Map<number, number>();
  const uncached = pruneCachedResults(ids, out);
  if (uncached.length > 0) {
    const marketStats = await fetchMarketStats(uncached, {
      regionId: REGION_THE_FORGE,
      systemId: SYSTEM_JITA,
    });
    for (const stat of marketStats) {
      if (stat.sell != undefined) {
        CACHE.set(stat.typeId, stat.sell, CACHE_DURATION);
        out.set(stat.typeId, stat.sell);
      }
    }
  }
  return out;
}

function pruneCachedResults(ids: number[], out: Map<number, number>) {
  const uncached: number[] = [];
  for (const id of ids) {
    const cachedValue = CACHE.get(id);
    if (cachedValue != undefined) {
      out.set(id, cachedValue);
    } else {
      uncached.push(id);
    }
  }
  return uncached;
}
