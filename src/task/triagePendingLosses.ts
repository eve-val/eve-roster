import { Tnex } from '../tnex';
import { JobLogger } from '../infra/taskrunner/Job';
import { dao } from '../db/dao';
import { SrpVerdictStatus } from '../db/dao/enums';
import { autoTriageLosses } from '../domain/srp/triage/autoTriageLosses';


/**
 * Manually runs the SRP autotriage rules on all losses that are still marked
 * "pending".
 *
 * This task doesn't need to be run under normal operation, but may be required
 * if (a) the SDE is updated or (b) the triage rules are changed.
 */
export async function triagePendingLosses(db: Tnex, job: JobLogger) {
  const rows = await dao.srp.listSrps(db, {
    status: SrpVerdictStatus.PENDING,
  });

  await autoTriageLosses(db, rows);
}
