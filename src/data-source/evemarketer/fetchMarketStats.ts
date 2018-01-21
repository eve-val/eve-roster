import axios from 'axios';
import { MarketStat } from './MarketStat';


const BASE_URL = `https://api.evemarketer.com/ec`;

export async function fetchMarketStats(params: {
    ids: number[],
    regionLimit?: number,
    useSystem?: number,
}): Promise<MarketStat[]> {
  if (params.ids.length == 0) {
    return [];
  } else {
    let response = await axios.get(`${BASE_URL}/marketstat/json`, {
      params: {
        typeid: params.ids.join(','),
        regionLimit: params.regionLimit,
        usesystem: params.useSystem,
      },
    });

    return response.data as MarketStat[];
  }
}
