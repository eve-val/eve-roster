import moment from "moment";
import { ProcessControl } from "./ProcessControl";
import { RotatingFileLogWriter } from "./RotatingFileLogWriter";
import { getRootPath } from "./getRootPath";
import * as logger from "./logger";

import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CHILD_LOCATION = path.join(__dirname, "../../server.js");
const MAX_LOG_LIFETIME = moment.duration(30, "days").asMilliseconds();

/**
 * Parent process that writes the main server process's logs to disk
 *
 * It's not safe for the roster to write its own logs as it may be crashing
 * at the time and not have enough time to complete the operation. Enter the
 * witness process.
 *
 * Witness has two primary responsibilities:
 * 1. Spawn (and possibly kill) the child process (main server)
 * 2. Write all logs from the child process to rotating log files
 *
 * Witness expects the child process to log all output to process.stdout. Logs
 * written to process.stderr will still be written to disk but ordering between
 * concurrent stdout and stderr lines may not be properly preserved.
 *
 * Witness expects the child process to include a timestamp and log level on
 * each line of output (see protocol.ts). If it doesn't, Witness will default
 * to `error` level and use the timestamp of when it received the log line. It
 * will also prepend "(raw)" to the log message. This may result in
 * out-of-order timestamps in the final log.
 */
function main() {
  const processControl = new ProcessControl(process);
  const child = processControl.spawnChild(CHILD_LOCATION);

  const logsPath = process.env.LOG_DIR || path.join(getRootPath(), "logs");

  const logWriter = new RotatingFileLogWriter(logsPath, MAX_LOG_LIFETIME);

  logWriter.on("error", (error) => {
    logger.error("Error while writing logs:");
    logger.error(error);
    processControl.dieImmediately();
  });

  logWriter.on("finish", () => {
    logger.log("Logs flushed");
    processControl.onLogsFlushed();
  });

  // There appears to be no way to get a single output stream, so we just pipe
  // both and hope that they are ordered correctly. Our code in the child always
  // writes to stdout, which limits our exposure here -- only 3rd party logs
  // could possibly be written out of order.
  child.stderr?.pipe(logWriter);
  child.stdout?.pipe(logWriter);
}

main();
