import moment = require('moment');

import { Tnex } from '../db/tnex';
import { JobLogger } from '../infra/taskrunner/Job';
import { dao } from '../db/dao';
import { SrpVerdictStatus } from '../db/dao/enums';
import { autoTriageLosses } from '../domain/srp/triage/autoTriageLosses';
import { Task } from '../infra/taskrunner/Task';


/**
 * Manually runs the SRP autotriage rules on all losses that are still marked
 * "pending".
 *
 * This task doesn't need to be run under normal operation, but may be required
 * if (a) the SDE is updated or (b) the triage rules are changed.
 */
export const triagePendingLosses: Task = {
  name: 'triagePendingLosses',
  displayName: 'Triage pending losses',
  description: 'Reruns SRP autotriage on all pending losses.',
  timeout: moment.duration(5, 'minutes').asMilliseconds(),
  executor,
};

async function executor(db: Tnex, job: JobLogger) {
  const rows = await dao.srp.listSrps(db, {
    status: SrpVerdictStatus.PENDING,
  });

  await autoTriageLosses(db, rows);
}
