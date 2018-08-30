import moment = require('moment');
import { inspect } from 'util';

import { ExpirationCache } from '../../util/ExpirationCache';
import { fetchMarketStats } from './fetchMarketStats';
import { SYSTEM_JITA } from '../../eve/constants/mapSolarSystems';
import { MarketStat } from './MarketStat';
import { buildLoggerFromFilename } from '../../infra/logging/buildLogger';

const logger = buildLoggerFromFilename(__filename);


const CACHE = new ExpirationCache<number, number>();
const CACHE_DURATION = moment.duration(4, 'hours').asMilliseconds();


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
    let marketStats: MarketStat[] | undefined;
    try {
      marketStats = await fetchMarketStats({
        ids: uncached,
        useSystem: SYSTEM_JITA,
      });
    } catch (err) {
      logger.warn(`Error while trying to retrieve market stats:`);
      logger.warn(`Url: ${err.config.url}`);
      logger.warn(`Params: ${inspect(err.config.params)}`);
      logger.warn(`${err.response.status} ${err.response.statusText}`);
      logger.warn(err.response.data);
    }
    if (marketStats != undefined) {
      for (let stat of marketStats) {
        let id = stat.sell.forQuery.types[0];
        CACHE.set(id, stat.sell.min, CACHE_DURATION);
        out.set(id, stat.sell.min);
      }
    }
  }
  return out;
}

function pruneCachedResults(ids: number[], out: Map<number, number>) {
  const uncached: number[] = [];
  for (let id of ids) {
    let cachedValue = CACHE.get(id);
    if (cachedValue != undefined) {
      out.set(id, cachedValue);
    } else {
      uncached.push(id);
    }
  }
  return uncached;
}
