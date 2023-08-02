import { fetchHullMarketValues, resolvePayout } from "./payout.js";
import { SrpVerdictStatus } from "../../../db/dao/enums.js";
import { TriagedLoss } from "./triageLosses.js";
import {
  SrpTriageJson,
  VerdictOptionJson,
} from "../../../../shared/types/srp/SrpLossJson.js";

/**
 * Converts the output for triageLosses() to the triage format in SrpLossJson.
 */
export async function triagedLossesToSuggestionJson(
  triagedLosses: TriagedLoss[],
) {
  const marketValues = await fetchHullMarketValues(triagedLosses);

  const out = new Map<number, SrpTriageJson>();
  for (const triagedLoss of triagedLosses) {
    let suggestedKey: string | null = null;
    const suggestedVerdicts: VerdictOptionJson[] = [];

    for (const suggestion of triagedLoss.suggestedVerdicts) {
      let key: string = suggestion.status;
      if (suggestion.status == SrpVerdictStatus.APPROVED) {
        key = `extra_${suggestedVerdicts.length}`;
        suggestedVerdicts.push({
          label: suggestion.label,
          key: key,
          payout: resolvePayout(
            suggestion,
            triagedLoss.loss.km_data,
            marketValues,
          ),
          verdict: suggestion.status,
        });
      } else if (suggestion.status == SrpVerdictStatus.INELIGIBLE) {
        key = `${suggestion.status}_${suggestion.reason}`;
      }
      if (suggestedKey == null) {
        suggestedKey = key;
      }
    }

    out.set(triagedLoss.loss.km_data.killmail_id, {
      extraOptions: suggestedVerdicts,
      suggestedOption: suggestedKey ?? "custom",
    });
  }
  return out;
}
