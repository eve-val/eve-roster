import Bluebird = require('bluebird');
import moment = require('moment');

import { Tnex, val, DEFAULT_NUM } from '../../tnex';
import { Dao } from '../dao';
import { cronLog } from '../tables';
import { buildLoggerFromFilename } from '../../logs/buildLogger';

const logger = buildLoggerFromFilename(__filename);


export default class CronDao {
  constructor(
      private _parent: Dao,
      ) {
  }

  getMostRecentJob(db: Tnex, taskName: string) {
    return db
        .select(cronLog)
        .where('cronLog_task', '=', val(taskName))
        .orderBy('cronLog_id', 'desc')
        .limit(1)
        .columns(
            'cronLog_id',
            'cronLog_task',
            'cronLog_start',
            'cronLog_end',
        )
        .fetchFirst();
  }

  startJob(db: Tnex, taskName: string) {
    return db
        .insert(cronLog, {
          cronLog_id: DEFAULT_NUM,
          cronLog_task: taskName,
          cronLog_start: Date.now(),
          cronLog_end: null,
          cronLog_result: null,
        }, 'cronLog_id');
  }

  finishJob(db: Tnex, jobId: number, result: string) {
    return db
        .update(cronLog, {
          cronLog_end: Date.now(),
          cronLog_result: result,
        })
        .where('cronLog_id', '=', val(jobId))
        .run();
  }

  dropOldJobs(db: Tnex, maxRecordsToRetainPerJobType: number) {
    return db
        .select(cronLog)
        .groupBy('cronLog_task')
        .columns('cronLog_task')
        .run()
    .then(rows => {
      return Bluebird.each(rows, row => {
        const task = row.cronLog_task;
        return db
            .select(cronLog)
            .columns('cronLog_id')
            .orderBy('cronLog_id', 'desc')
            .offset(maxRecordsToRetainPerJobType)
            .limit(1)
            .where('cronLog_task', '=', val(task))
            .fetchFirst()
        .then(row => {
          if (row == null) {
            return 0;
          } else {
            return db
                .del(cronLog)
                .where('cronLog_id', '<=', val(row.cronLog_id))
                .andWhere('cronLog_task', '=', val(task))
                .run();
          }
        })
        .then(deleteCount => {
          logger.info(
              `Truncated ${deleteCount} cronLog rows for task "${task}".`);
        })
      })
    });
  }

  getRecentLogs(db: Tnex) {
    return db
        .select(cronLog)
        .columns(
            'cronLog_id',
            'cronLog_task',
            'cronLog_start',
            'cronLog_end',
            'cronLog_result',
        )

        // HACK to limit log spam until we get better UI
        // Filter out all syncCharacter location entries unless they ended in
        // error or were run in the last minute.
        .where('cronLog_task', '!=', val('syncCharacterLocations'))
        .orWhere('cronLog_result', '!=', val('success'))
        .orWhere(
            'cronLog_start',
            '>=',
            val(moment().subtract(1, 'minute').valueOf()))

        .orderBy('cronLog_id', 'desc')
        .limit(400)
        .run();
  }
}
