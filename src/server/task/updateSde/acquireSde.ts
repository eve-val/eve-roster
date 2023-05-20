import * as fs from "fs";
import { default as axios } from "axios";
import progress from "progress-stream";

import { JobLogger } from "../../infra/taskrunner/Job.js";

import bz2 from "unbzip2-stream";

const FUZZWORKS_DUMP_URL = "https://www.fuzzwork.co.uk/dump";
const SQLITE_DUMP_URL = `${FUZZWORKS_DUMP_URL}/sqlite-latest.sqlite.bz2`;

const SDE_DOWNLOAD_PROGRESS_LABEL = "Downloading SDE...";

export async function acquireSde(
  job: JobLogger,
  zipFile: string,
  sqlFile: string
) {
  await downloadSde(job, zipFile);
  await unbzipFile(job, zipFile, sqlFile);
}

function downloadSde(job: JobLogger, target: string) {
  return new Promise<void>((resolve, reject) => {
    job.setProgress(undefined, SDE_DOWNLOAD_PROGRESS_LABEL);
    axios
      .get(SQLITE_DUMP_URL, {
        responseType: "stream",
      })
      .then((response) => {
        (response.data as fs.ReadStream)
          .on("error", reject)
          .pipe(
            progress({
              time: 1000,
              length: parseInt(response.headers["content-length"]!),
            })
          )
          .on("progress", (e) => {
            job.setProgress(e.percentage / 100, SDE_DOWNLOAD_PROGRESS_LABEL);
          })
          .on("error", reject)
          .pipe(fs.createWriteStream(target))
          .on("error", reject)
          .on("close", () => {
            resolve();
          });
      });
  });
}

function unbzipFile(job: JobLogger, srcPath: string, destPath: string) {
  return new Promise((resolve, reject) => {
    job.setProgress(undefined, "Unzipping SDE...");
    const src = fs.createReadStream(srcPath);
    const dest = fs.createWriteStream(destPath);

    src
      .on("error", reject)
      .pipe(bz2())
      .on("error", reject)
      .pipe(dest)
      .on("error", reject)
      .on("finish", resolve);
  });
}
