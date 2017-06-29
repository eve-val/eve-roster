import Promise = require('bluebird');

import { jsonEndpoint } from '../../../../route-helper/protectedEndpoint';
import { dao } from '../../../../dao';
import { Tnex } from '../../../../tnex';

export type Output = LogEntry[];

export interface LogEntry {
  id: number,
  task: string,
  start: number,
  end: number | null,
  result: string | null,
}

export function getTaskLogs(db: Tnex) {
  return dao.cron.getRecentLogs(db)
  .then(rows => {
    return rows.map(row => {
      return {
        id: row.cronLog_id,
        task: row.cronLog_task,
        start: row.cronLog_start,
        end: row.cronLog_end,
        result: row.cronLog_result,
      };
    });
  });
}

export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  privs.requireRead('cronLogs', false);

  return getTaskLogs(db);
});
