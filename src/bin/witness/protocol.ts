import { Moment } from "moment";
import moment = require("moment");

const LOG_FILENAME_PATTERN = /^roster_logs_(\d{4}-\d{2}-\d{2}).txt$/;
const INPUT_LOG_LINE_PATTERN = /^(\d+) ([EWIVD]) ?(.*)/;
const OUTPUT_TIMESTAMP_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSS[Z]';
const OUTPUT_FORMAT_VERSION = 0;

export type LevelTag = 'E' | 'W' | 'I' | 'V' | 'D';

/**
 * This must be the first line of any log file. May appear later in the log
 * file as well.
 */
export function getLogFormatSpecifier() {
  return `@format:roster_log_file_${OUTPUT_FORMAT_VERSION}\n`;
}

export function formatLogFilename(logStart: Moment) {
  return `roster_logs_${logStart.format('YYYY-MM-DD')}.txt`;
}

export function parseLogFilename(filename: string) {
  const match = LOG_FILENAME_PATTERN.exec(filename);
  if (!match) {
    return null;
  } else {
    return moment.utc(match[1]);
  }
}

export function formatOutputLine(
    timestamp: Moment,
    levelTag: string,
    message: string,
    ) {
  const timestampStr = timestamp.format(OUTPUT_TIMESTAMP_FORMAT);
  const pidStr = process.pid.toString().padStart(5);
  return `${timestampStr} ${pidStr} ${levelTag} ${message}`;
}

export function parseInputLine(line: string) {
  return INPUT_LOG_LINE_PATTERN.exec(line);
}

export function formatInputLine(
    timestamp: number,
    levelTag: LevelTag,
    message: string,
) {
  return `${timestamp} ${levelTag} ${message}\n`;
}
