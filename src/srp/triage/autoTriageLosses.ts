import { Tnex } from '../../tnex';
import { LossRow, triageLosses, TriagedLoss } from './triageLosses';
import { fetchHullMarketValues, resolvePayout } from './payout';
import { SrpVerdictReason, SrpVerdictStatus } from '../../dao/enums';
import { dao } from '../../dao';


/**
 * Given a list of losses, applies triage rules to each one and commits and
 * verdicts that are marked autocommit.
 */
export async function autoTriageLosses(
    db: Tnex,
    losses: LossRow[],
) {
  const triaged = await triageLosses(db, losses);
  const marketValues = await fetchHullMarketValues(triaged);

  for (let triagedLoss of triaged) {
    await maybeAutocommitVerdict(db, triagedLoss, marketValues);
  }
}

export async function maybeAutocommitVerdict(
    db: Tnex,
    loss: TriagedLoss,
    marketValues: Map<number, number>,
) {
  let status = SrpVerdictStatus.PENDING;
  let reason: SrpVerdictReason | null = null;
  let payout: number = 0;
  for (let i = 0; i < loss.suggestedVerdicts.length; i++) {
    let verdict = loss.suggestedVerdicts[i];
    if (verdict.autoCommit == 'always'
        || verdict.autoCommit == 'leader' && i == 0) {
      status = verdict.status;
      if (verdict.status == SrpVerdictStatus.APPROVED) {
        payout = resolvePayout(verdict, loss.killmail, marketValues);
      } else {
        reason = verdict.reason;
      }
    }
  }

  if (status != SrpVerdictStatus.PENDING) {
    await dao.srp.setSrpVerdict(
        db,
        loss.killmail.killmail_id,
        status,
        reason,
        payout,
        null);
  }
}
