import * as fs from "fs";
import * as path from "path";
import moment = require("moment");
import { asyncEach } from "./asyncEach";
import { BasicCallback } from "../../util/stream/core";
import { parseLogFilename } from "./protocol";
import * as logger from "./logger";

/**
 * Deletes any log files older than MAX_LOG_LIFETIME.
 */
export function pruneOldLogs(
  directory: string,
  maxLifetime: number,
  callback: BasicCallback
) {
  fs.readdir(directory, {}, (err, files) => {
    if (err) {
      callback(err);
      return;
    }
    asyncEach(
      files as string[],
      (file, callback) => {
        const timestamp = parseLogFilename(file);

        if (timestamp) {
          if (moment().valueOf() - timestamp.valueOf() > maxLifetime) {
            logger.log(`Deleting old log file "${file}".`);
            fs.unlink(path.join(directory, file), callback);
          } else {
            callback();
          }
        } else {
          callback();
        }
      },
      callback
    );
  });
}
