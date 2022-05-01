import moment from "moment";

import { Tnex } from "../db/tnex/index.js";
import { JobLogger } from "../infra/taskrunner/Job.js";
import { dao } from "../db/dao.js";
import { SrpVerdictStatus } from "../db/dao/enums.js";
import { autoTriageLosses } from "../domain/srp/triage/autoTriageLosses.js";
import { Task } from "../infra/taskrunner/Task.js";

/**
 * Manually runs the SRP autotriage rules on all losses that are still marked
 * "pending".
 *
 * This task doesn't need to be run under normal operation, but may be required
 * if (a) the SDE is updated or (b) the triage rules are changed.
 */
export const triagePendingLosses: Task = {
  name: "triagePendingLosses",
  displayName: "Triage pending losses",
  description: "Reruns SRP autotriage on all pending losses.",
  timeout: moment.duration(5, "minutes").asMilliseconds(),
  executor,
};

async function executor(db: Tnex, _job: JobLogger) {
  const rows = await dao.srp.listSrps(db, {
    status: SrpVerdictStatus.PENDING,
  });

  await autoTriageLosses(db, rows);
}
