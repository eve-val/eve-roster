import * as fs from "fs";
import * as tmp from "tmp";
import moment from "moment";

import { Tnex } from "../db/tnex";
import { JobLogger } from "../infra/taskrunner/Job";
import { acquireSde } from "./updateSde/acquireSde";
import { ingestSde } from "./updateSde/ingestSde";
import { Task } from "../infra/taskrunner/Task";

/**
 * Downloads the EVE static data export (SDE) and imports the parts that we
 * need into the DB. In general, this means definitions for items, skills, and
 * ships. Other stuff, like the locations of planets and NPCs, we discard.
 *
 * Instead of downloading the SDE directly from CCP, we use a streamlined
 * version provided by Fuzzworks.
 */
export const updateSde: Task = {
  name: "updateSde",
  displayName: "Update SDE",
  description: "Installs latest version of EVE universe data.",
  timeout: moment.duration(20, "minutes").asMilliseconds(),
  executor,
};

async function executor(db: Tnex, job: JobLogger) {
  let zipPath: string | null = null;
  let sqlPath: string | null = null;

  try {
    zipPath = await createTmpFile("sde_", ".sqlite.bz2");
    sqlPath = await createTmpFile("sde_", ".sqlite");

    job.info("Created temp files:");
    job.info("  " + zipPath);
    job.info("  " + sqlPath);

    await acquireSde(job, zipPath, sqlPath);
    await ingestSde(job, db, zipPath, sqlPath);
  } finally {
    deleteFile(zipPath);
    deleteFile(sqlPath);
  }
}

async function createTmpFile(prefix: string, postfix: string) {
  return new Promise<string>((resolve, reject) => {
    tmp.file(
      { prefix: prefix, postfix: postfix, discardDescriptor: true },
      (err, path, _fd, _cleanupCallback) => {
        if (err) {
          reject(err);
        } else {
          resolve(path);
        }
      }
    );
  });
}

function deleteFile(path: string | null) {
  if (path != null) {
    fs.unlink(path, (_err) => {
      // If there's an error, ah well, we did our best.
    });
  }
}
