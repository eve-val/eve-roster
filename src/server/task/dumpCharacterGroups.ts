import moment from "moment";

import * as fs from "fs";

import { Tnex } from "../db/tnex/index.js";
import { dao } from "../db/dao.js";
import { JobLogger } from "../infra/taskrunner/Job.js";
import { Task } from "../infra/taskrunner/Task.js";

export const dumpCharacterGroups: Task = {
  name: "dumpCharacterGroups",
  displayName: "Dump main characters and groups",
  description: "Saves JSON file for slamgt with character/group associations.",
  timeout: moment.duration(5, "minutes").asMilliseconds(),
  executor,
};

async function executor(db: Tnex, _job: JobLogger) {
  await dao.group
    .getAllGroupsByAccount(db)
    .then(async (accountsToGroups) => {
      const ret = new Map<string, string[]>();
      for (const [acc, grps] of accountsToGroups) {
        const main = await dao.account.getMain(db, acc);
        ret.set(String(main!.character_id), grps);
      }
      return ret;
    })
    .then((mainsToGroups) => {
      fs.writeFileSync(
        "./userdump.json",
        JSON.stringify(Object.fromEntries(mainsToGroups))
      );
    });
}
