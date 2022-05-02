import moment from "moment";
import { EsiEndpoint } from "../EsiEndpoint.js";
import { AxiosResponse } from "axios";
import { SimpleMap } from "../../../util/simpleTypes.js";
import { buildLogger } from "../../../infra/logging/buildLogger.js";

const logger = buildLogger("esi");

export function checkEsiResponseForWarnings(
  endpoint: EsiEndpoint,
  response: AxiosResponse
) {
  const warning: string = response.headers["warning"];

  if (warning != undefined) {
    const tag = warning.startsWith(`199`)
      ? "newVer"
      : warning.startsWith(`299`)
      ? "deprecated"
      : "unknown";

    logPathWarning(endpoint.path, tag, warning);
  }
}

const ERR_LOG_TIMESTAMPS = new Map<string, SimpleMap<number>>();
const MIN_TIME_BETWEEN_LOGS = moment.duration(1, "hour").asMilliseconds();

function logPathWarning(path: string, tag: string, message: string) {
  const entry: SimpleMap<number> = ERR_LOG_TIMESTAMPS.get(path) || {};
  const prevTimestamp = entry[tag] || 0;

  if (Date.now() - prevTimestamp > MIN_TIME_BETWEEN_LOGS) {
    // TODO: Ping Slack about this
    logger.error(`ESI WARNING for path "${path}": ${message}.`);
    entry[tag] = Date.now();
    ERR_LOG_TIMESTAMPS.set(path, entry);
  }
}
