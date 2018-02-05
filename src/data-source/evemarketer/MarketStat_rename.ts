
/**
 * JSON format for the EVE Marketeer market stats api at /marketstat/json.
 */
export interface MarketStat {
  buy: BuySellStat,
  sell: BuySellStat,
}

export interface BuySellStat {
  forQuery: {
    bid: boolean,
    types: number[],
    regions: number[],
    systems: number[],
    hours: number,
    minq: number,
  },
  volume: number,
  wavg: number,
  avg: number,
  min: number,
  max: number,
  variance: number,
  stdDev: number,
  median: number,
  fivePercent: number,
  highToLow: true,
  generated: number,
}
