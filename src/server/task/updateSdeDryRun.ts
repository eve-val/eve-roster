import moment from "moment";
import { Task } from "../infra/taskrunner/Task.js";
import { Tnex } from "../db/tnex/index.js";
import { JobLogger } from "../infra/taskrunner/Job.js";
import { ingestSdeDryRun } from "./updateSde/ingestSde.js";

export const updateSdeDryRun: Task = {
  name: "updateSdeDryRun",
  displayName: "Update SDE [Dry Run]",
  description: "Parse but don't ingest the SDE from ./tmp/sqlite-latest.sqlite",
  timeout: moment.duration(20, "minutes").asMilliseconds(),
  executor,
};

async function executor(db: Tnex, job: JobLogger) {
  await ingestSdeDryRun(job, db, "./tmp/sqlite-latest.sqlite");
}
