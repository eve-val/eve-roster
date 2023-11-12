import { default as axios } from "axios";
import { inspect } from "util";
import { ESI_MARKETS_$regionId_ORDERS } from "../esi/endpoints.js";
import { fetchEsiEx } from "../esi/fetch/fetchEsi.js";
import { fileURLToPath } from "url";
import { buildLoggerFromFilename } from "../../infra/logging/buildLogger.js";
import { streamParallelJobs } from "../../util/asyncUtil.js";
import { isAnyEsiError } from "../esi/error.js";

const logger = buildLoggerFromFilename(fileURLToPath(import.meta.url));

/**
 * Fetches the current buy and sell prices for each of the specified typeIds,
 * filtered by region/system/location.
 *
 * Data is retrieved from ESI.
 *
 * @returns A map of typeId to [MarketStats]. May return an incomplete or empty
 * map if the network request to the data source fails or if the item is not
 * for sale within the specified region.
 */
export async function fetchMarketStats(
  typeIds: number[],
  params: MarketStatParams,
) {
  const marketStats: EsiRegionalMarketStats[] = [];

  await streamParallelJobs({
    jobs: typeIds,
    worker: (id) => fetchMarketStatsForSingleType(id, params),
    resultHandler: (result) => {
      if (result.status == "fulfilled") {
        const marketResult: EsiRegionalMarketStats = {
          typeId: result.value.typeId,
        };
        if (result.value.buy.length > 0) {
          marketResult.buy = result.value.buy[0].price;
        }
        if (result.value.sell.length > 0) {
          marketResult.sell = result.value.sell[0].price;
        }
        marketStats.push(marketResult);
      } else {
        const err = result.reason;
        if (!isAnyEsiError(err)) {
          throw err;
        }
        logger.warn(`Error while trying to retrieve market stats:`);
        logger.warn(`  ` + err.message);
        const terr = err.cause();
        if (axios.isAxiosError(terr)) {
          logger.warn(`  Url: ${terr.config?.url}`);
          logger.warn(`  Params: ${inspect(terr.config?.params)}`);
          logger.warn(
            `  Status: ${terr.response?.status} ${terr.response?.statusText}`,
          );
          logger.warn(`  Data: ${inspect(terr.response?.data)}`);
        }
      }
    },
    maxParallelism: 10,
  });

  return marketStats;
}

async function fetchMarketStatsForSingleType(
  typeId: number,
  params: MarketStatParams,
) {
  let pageId = 1;
  let maxPages = 1;
  const buyOrders: EsiMarketOrder[] = [];
  const sellOrders: EsiMarketOrder[] = [];

  while (pageId <= maxPages) {
    const { data, pageCount } = await fetchEsiEx(ESI_MARKETS_$regionId_ORDERS, {
      regionId: params.regionId,
      type_id: typeId,
      order_type: "all",
      page: pageId,
    });

    pageId++;
    maxPages = pageCount;

    for (const order of data) {
      if (params.systemId != null && order.system_id != params.systemId) {
        continue;
      }
      if (params.locationId != null && order.location_id != params.locationId) {
        continue;
      }

      if (order.is_buy_order) {
        buyOrders.push(order);
      } else {
        sellOrders.push(order);
      }
    }
  }

  buyOrders.sort((a, b) => b.price - a.price);
  sellOrders.sort((a, b) => a.price - b.price);

  return { typeId, buy: buyOrders, sell: sellOrders };
}

type EsiMarketOrder = (typeof ESI_MARKETS_$regionId_ORDERS)["response"][0];

export interface EsiRegionalMarketStats {
  typeId: number;
  buy?: number;
  sell?: number;
}

interface MarketStatParams {
  regionId: number;
  systemId?: number;
  locationId?: number;
}
