import { Tnex } from "../../../db/tnex";
import { LossRow, triageLosses, TriagedLoss } from "./triageLosses";
import { fetchHullMarketValues, resolvePayout } from "./payout";
import { SrpVerdictReason, SrpVerdictStatus } from "../../../db/dao/enums";
import { dao } from "../../../db/dao";

/**
 * Given a list of losses, applies triage rules to each one and commits and
 * verdicts that are marked autocommit.
 */
export async function autoTriageLosses(db: Tnex, losses: LossRow[]) {
  const config = await dao.config.get(db, "srpJurisdiction");

  const triaged = await triageLosses(db, losses);
  const marketValues = await fetchHullMarketValues(triaged);

  for (const triagedLoss of triaged) {
    await maybeAutocommitVerdict(
      db,
      triagedLoss,
      marketValues,
      config.srpJurisdiction
    );
  }
}

type SrpJurisdiction = {
  start: number;
  end: number | undefined;
} | null;

async function maybeAutocommitVerdict(
  db: Tnex,
  triaged: TriagedLoss,
  marketValues: Map<number, number>,
  jurisdiction: SrpJurisdiction
) {
  let status = SrpVerdictStatus.PENDING;
  let reason: SrpVerdictReason | null = null;
  let payout = 0;

  if (triaged.loss.km_data.victim.character_id == undefined) {
    status = SrpVerdictStatus.INELIGIBLE;
    reason = SrpVerdictReason.NO_RECIPIENT;
  } else if (!withinJurisdiction(triaged.loss.km_timestamp, jurisdiction)) {
    status = SrpVerdictStatus.INELIGIBLE;
    reason = SrpVerdictReason.OUTSIDE_JURISDICTION;
  } else {
    for (let i = 0; i < triaged.suggestedVerdicts.length; i++) {
      const verdict = triaged.suggestedVerdicts[i];
      if (
        verdict.autoCommit == "always" ||
        (verdict.autoCommit == "leader" && i == 0)
      ) {
        status = verdict.status;
        if (verdict.status == SrpVerdictStatus.APPROVED) {
          payout = resolvePayout(verdict, triaged.loss.km_data, marketValues);
        } else {
          reason = verdict.reason;
        }
      }
    }
  }

  if (status != SrpVerdictStatus.PENDING) {
    await dao.srp.setSrpVerdict(
      db,
      triaged.loss.km_data.killmail_id,
      status,
      reason,
      payout,
      null
    );
  }
}

function withinJurisdiction(timestamp: number, jurisdiction: SrpJurisdiction) {
  return (
    jurisdiction != null &&
    timestamp >= jurisdiction.start &&
    (jurisdiction.end == undefined || timestamp <= jurisdiction.end)
  );
}
