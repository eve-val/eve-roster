import { Logger } from "./Logger";
import { WitnessLogger } from "./WitnessLogger";

/**
 * Creates an object that can be used to log messages to persistent logs.
 *
 * In general, you should create a new logger for each TS module (i.e. each
 * file).
 *
 * Do not log any sensitive information such as access tokens or passwords.
 *
 * @param tag A short string that represents your module (frequently just its
 *    name).
 */
export function buildLogger(tag: string): Logger {
  return new WitnessLogger(tag);
}

/**
 * Same as buildLogger(), but automatically extracts the tag from the file's
 * filename. Example usage: <code>buildLoggerFromFilename(__filename);</code>.
 */
export function buildLoggerFromFilename(filename: string): Logger {
  return new WitnessLogger(extractTagFromFilename(filename));
}

const FILENAME_PATTERN = /([^/]+)(\.[^/]+)$/;

function extractTagFromFilename(filename: string) {
  const result = FILENAME_PATTERN.exec(filename);
  if (result == null) {
    throw new Error(`Invalid filename "${filename}".`);
  }
  return result[1];
}
