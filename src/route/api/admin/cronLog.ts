import Promise = require('bluebird');

import { jsonEndpoint } from '../../../route-helper/protectedEndpoint';
import { dao } from '../../../dao';

export interface Output {
  rows: LogEntry[],
}

interface LogEntry {
  id: number,
  task: string,
  start: number,
  end: number | null,
  result: string | null,
}

export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  privs.requireRead('cronLogs', false);

  return dao.cron.getRecentLogs(db)
  .then(rows => {
    const strippedRows = rows.map(row => {
      return {
        id: row.cronLog_id,
        task: row.cronLog_task,
        start: row.cronLog_start,
        end: row.cronLog_end,
        result: row.cronLog_result,
      };
    });
    return {
      rows: strippedRows,
    };
  });
});
