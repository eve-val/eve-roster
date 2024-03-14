import path from "path";
import fs from "node:fs/promises";
import { fileURLToPath } from "url";
import moment, { Moment } from "moment";
import { dao } from "../../../../db/dao.js";
import { NotFoundError } from "../../../../error/NotFoundError.js";
import { jsonEndpoint } from "../../../../infra/express/protectedEndpoint.js";
import { idParam } from "../../../../util/express/paramVerifier.js";
import { getEnv } from "../../../../infra/init/Env.js";
import { buildLoggerFromFilename } from "../../../../infra/logging/buildLogger.js";
import { Admin_Tasks_Job_GET } from "../../../../../shared/route/api/admin/tasks/job_GET.js";

const env = getEnv();
const logger = buildLoggerFromFilename(fileURLToPath(import.meta.url));

export default jsonEndpoint(
  async (req, res, db, account, privs): Promise<Admin_Tasks_Job_GET> => {
    privs.requireRead("serverConfig");

    const jobId = idParam(req, "id");

    const result = await dao.cron.getJob(db, jobId);
    if (result == null) {
      throw new NotFoundError();
    }

    const start = moment(result.cronLog_start);
    const end = result.cronLog_end ? moment(result.cronLog_end) : null;

    return {
      id: result.cronLog_id,
      task: result.cronLog_task,
      start: result.cronLog_start,
      end: result.cronLog_end,
      result: result.cronLog_result,
      logs: await loadJobLog(start, end),
    };
  },
);

async function loadJobLog(
  start: Moment,
  end: Moment | null,
): Promise<string[]> {
  const file = await readLogFile(start);
  if (file == null) {
    return [];
  }
  // TODO: Use a stream instead so we don't have to load the entire file into
  // memory
  const lines = file.split("\n");
  const filteredLines = [];
  for (const line of lines) {
    const timestampMatch = LOG_LINE_PATTERN.exec(line);
    if (timestampMatch != null) {
      const lineStamp = moment(timestampMatch[1]);
      if (end != null && lineStamp.isAfter(end)) {
        break;
      }
      if (lineStamp.isSameOrAfter(start)) {
        filteredLines.push(line);
      }
    }
  }
  return filteredLines;
}

async function readLogFile(start: Moment): Promise<string | null> {
  try {
    return await fs.readFile(getLogFilePath(start), { encoding: "utf-8" });
  } catch (e) {
    logger.error(`Error while opening logs for timestamp ${start}: ${e}`);
    return null;
  }
}

function getLogFilePath(start: Moment) {
  return path.join(
    env.LOG_DIR,
    `roster_logs_${start.format("YYYY-MM-DD")}.txt`,
  );
}

const LOG_LINE_PATTERN = /^([^ ]+) /;
