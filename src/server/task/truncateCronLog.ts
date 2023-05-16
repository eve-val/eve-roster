import moment from "moment";

import { Tnex } from "../db/tnex/index.js";
import { dao } from "../db/dao.js";
import { JobLogger } from "../infra/taskrunner/Job.js";
import { Task } from "../infra/taskrunner/Task.js";

export const truncateCronLog: Task = {
  name: "truncateCronLog",
  displayName: "Truncate cron log",
  description: "Prunes very old cron logs.",
  timeout: moment.duration(5, "minutes").asMilliseconds(),
  executor,
};

async function executor(db: Tnex, _job: JobLogger) {
  await dao.cron.dropOldJobs(db, 10000);
}
