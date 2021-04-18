import { jsonEndpoint } from "../../../../infra/express/protectedEndpoint";
import { dao } from "../../../../db/dao";
import { Tnex } from "../../../../db/tnex";

export type Output = LogEntry[];

export interface LogEntry {
  id: number;
  task: string;
  start: number;
  end: number | null;
  result: string | null;
}

export async function getTaskLogs(db: Tnex) {
  const rows = await dao.cron.getRecentLogs(db);
  return rows.map((row) => {
    return {
      id: row.cronLog_id,
      task: row.cronLog_task,
      start: row.cronLog_start,
      end: row.cronLog_end,
      result: row.cronLog_result,
    };
  });
}

export default jsonEndpoint(
  (req, res, db, account, privs): Promise<Output> => {
    privs.requireRead("cronLogs", false);

    return getTaskLogs(db);
  }
);
