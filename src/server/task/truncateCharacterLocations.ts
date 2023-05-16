import moment from "moment";

import { Tnex } from "../db/tnex/index.js";
import { dao } from "../db/dao.js";
import { JobLogger } from "../infra/taskrunner/Job.js";
import { Task } from "../infra/taskrunner/Task.js";

export const truncateCharacterLocations: Task = {
  name: "truncateCharacterLocations",
  displayName: "Truncate location log",
  description: "Prunes very old character locations.",
  timeout: moment.duration(10, "minutes").asMilliseconds(),
  executor,
};

async function executor(db: Tnex, _job: JobLogger) {
  const cutoff = moment().subtract(120, "days").valueOf();

  await dao.characterLocation.deleteOldLocations(db, cutoff);
}
