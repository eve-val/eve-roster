import moment from "moment";

import { clock } from "../../../util/wrapped/clock.js";
import { ESI_MARKETS_PRICES } from "../endpoints.js";
import { fetchEsi } from "../fetch/fetchEsi.js";
import { buildLogger } from "../../../infra/logging/buildLogger.js";

const logger = buildLogger("fetchAverageMarketPrices");

/**
 * Looks up the average market prices of items
 *
 * Uses ESI's definition of "average price", which is a 30-day rolling average
 * of all prices across the galaxy. When available, uses the adjusted_price
 * version, which CCP has designed to be more resistant to manipulation.
 * Otherwise, uses the pure average.
 *
 * This request is cached for about 1 hour; successive requests are very fast.
 *
 * @param typeIds The items to look up prices for
 * @param requireFresh If true, throw an error if we've failed to update prices
 *   recently. If false, return the previously-cached version (which may be 0).
 * @returns A Map from typeId to price. This map is guaranteed to contain an
 *   an entry for each orginal typeId, although the price may be zero. In
 *   particular, items that cannot be sold on the market (such as civilian
 *   modules) will always have a price of zero.
 */
export function fetchAverageMarketPrices(
  typeIds: number[],
  requireFresh = false,
) {
  return INSTANCE.fetchAverageMarketPrices(typeIds, requireFresh);
}

class MarketPriceCache {
  private readonly priceMap = new Map<number, number>();
  private fetchStats = {
    attemptedCount: 0,
    attemptedTimestamp: 0,
    successfulTimestamp: 0,
  };
  private fetchPromise: Promise<void> | null = null;

  async fetchAverageMarketPrices(typeIds: number[], requireFresh: boolean) {
    if (this.cacheNeedsRefresh()) {
      try {
        await this.refreshPriceCache();
      } catch (e) {
        if (requireFresh) {
          throw e;
        }
      }
    }
    const resultMap = new Map<number, number>();
    for (const typeId of typeIds) {
      resultMap.set(typeId, this.priceMap.get(typeId) ?? 0);
    }
    return resultMap;
  }

  private cacheNeedsRefresh() {
    const now = clock.now();
    return (
      now - this.fetchStats.successfulTimestamp >= PRICE_CACHE_DURATION &&
      (now - this.fetchStats.attemptedTimestamp >= RETRY_TIMEOUT_WINDOW ||
        this.fetchStats.attemptedCount < MAX_ATTEMPTS)
    );
  }

  private refreshPriceCache() {
    if (this.fetchPromise == null) {
      this.fetchPromise = this.refreshPriceCacheInner().then((value) => {
        this.fetchPromise = null;
        return value;
      });
    }
    return this.fetchPromise;
  }

  private async refreshPriceCacheInner(): Promise<void> {
    const fetchTime = clock.now();
    this.fetchStats.attemptedTimestamp = fetchTime;
    this.fetchStats.attemptedCount++;

    let result;
    try {
      result = await fetchEsi(ESI_MARKETS_PRICES, {});
    } catch (e) {
      const error = new Error(
        `Error while trying to fetch global market prices`,
        { cause: e },
      );
      logger.error(error.message, error);
      throw error;
    }

    for (const entry of result) {
      // Use adjusted_price where it's present, but in the (inexplicable) cases
      // where it's zero, fall back to average_price
      this.priceMap.set(
        entry.type_id,
        entry.adjusted_price || entry.average_price,
      );
    }
    logger.info(`Updated ${result.length} market prices`);
    this.fetchStats.successfulTimestamp = fetchTime;
    this.fetchStats.attemptedCount = 0;
  }
}

const INSTANCE = new MarketPriceCache();

const PRICE_CACHE_DURATION = moment.duration(3630, "seconds").asMilliseconds();
const RETRY_TIMEOUT_WINDOW = moment.duration(60, "seconds").asMilliseconds();
const MAX_ATTEMPTS = 2;
