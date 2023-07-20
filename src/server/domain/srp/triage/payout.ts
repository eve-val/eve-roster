import { ZKillmail } from "../../../data-source/zkillboard/ZKillmail.js";
import { ApprovedVerdict, MarketPayout } from "./TriageRule.js";
import { fetchJitaSellPrices } from "../../../data-source/evemarketer/fetchJitaSellPrices.js";
import { SrpVerdictStatus } from "../../../db/dao/enums.js";
import { TriagedLoss } from "./triageLosses.js";

/**
 * Given a list of triaged losses, looks up any relevant market prices. Used
 * when calling resolvePayout(), below.
 */
export async function fetchHullMarketValues(losses: TriagedLoss[]) {
  const marketLookups = extractMarketLookups(losses);
  const marketValues = await fetchJitaSellPrices(marketLookups);
  return marketValues;
}

/**
 * Given an SRP verdict, returns the final value in ISK that should be paid.
 * This value may fluctuate with market prices.
 */
export function resolvePayout(
  approval: ApprovedVerdict,
  killmail: ZKillmail,
  marketValues: Map<number, number>,
) {
  let value: number;
  switch (approval.payout.kind) {
    case "Static":
      return approval.payout.value;
    case "LossValue":
      value = killmail.zkb.totalValue;
      if (approval.payout.max != undefined) {
        value = Math.min(approval.payout.max, value);
      }
      return value;
    case "Market":
      return getMarketValue(
        approval.payout,
        killmail.victim.ship_type_id,
        marketValues,
      );
  }
}

function extractMarketLookups(losses: TriagedLoss[]) {
  const lookupIds = new Set<number>();
  for (const loss of losses) {
    for (const verdict of loss.suggestedVerdicts) {
      if (
        verdict.status == SrpVerdictStatus.APPROVED &&
        verdict.payout.kind == "Market"
      ) {
        if (verdict.payout.items != undefined) {
          for (const item of verdict.payout.items) {
            lookupIds.add(item);
          }
        } else {
          lookupIds.add(loss.loss.km_data.victim.ship_type_id);
        }
      }
    }
  }
  return Array.from(lookupIds);
}

function getMarketValue(
  payout: MarketPayout,
  shipId: number,
  marketValues: Map<number, number>,
) {
  if (payout.items == undefined) {
    return (
      (marketValues.get(shipId) ?? payout.fallback) + (payout.additional ?? 0)
    );
  } else {
    let sum = 0;
    for (const item of payout.items) {
      const value = marketValues.get(item);
      if (value != undefined) {
        sum += value;
      } else {
        return payout.fallback + (payout.additional ?? 0);
      }
    }
    return sum;
  }
}
