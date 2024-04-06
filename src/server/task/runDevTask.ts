import moment from "moment";
import { Task } from "../infra/taskrunner/Task.js";
import { Tnex } from "../db/tnex/Tnex.js";
import { JobLogger } from "../infra/taskrunner/Job.js";

/**
 * A runnable task that is only available in dev mode and can be used to test
 * out specific behaviors while developing locally.
 */
export const runDevTask: Task = {
  name: "runDevTask",
  displayName: "Run dev task",
  description: "Used for local development",
  timeout: moment.duration(20, "minutes").asMilliseconds(),
  executor,
};

async function executor(db: Tnex, job: JobLogger) {
  job.info(`Fill this in as desired, probably using ${db}`);
}
