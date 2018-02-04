import moment = require('moment');

import { Tnex } from '../tnex';
import { dao } from '../dao';
import { SrpVerdictStatus, SrpVerdictReason } from '../dao/enums';
import { triageLosses, TriagedLoss } from './triage/triageLosses';
import { fetchHullMarketValues, resolvePayout } from './triage/payout';
import { SrpVerdict } from '../dao/tables';


/**
 * For a given source corporation, creates SRP entries for every loss that
 * doesn't yet have one. Performs an initial triage pass on each loss and may
 * auto-deny/auto-approve some losses.
 */
export async function createSrpEntriesForNewLosses(db: Tnex) {
  const rows = await dao.srp.listUntriagedLosses(db);

  const characterized = await triageLosses(db, rows);
  const marketValues = await fetchHullMarketValues(characterized);
  const outRows = characterized.map(
      loss => renderLossToVerdictRows(loss, marketValues))

  await dao.srp.addSrpVerdictEntries(db, outRows);
}

function renderLossToVerdictRows(
  loss: TriagedLoss,
  marketValues: Map<number, number>,
): SrpVerdict {
  let rows: SrpVerdict[] = [];

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

  return {
    srpv_killmail: loss.killmail.killmail_id,
    srpv_status: status,
    srpv_reason: reason,
    srpv_payout: payout,
    srpv_reimbursement: null,
    srpv_modified: Date.now(),
    srpv_renderingAccount: null,
  };
}
