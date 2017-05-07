import Promise = require('bluebird');

import { Tnex, val, DEFAULT_NUM } from '../tnex';
import { Dao } from '../dao';
import { cronLog } from './tables';


export default class CronDao {
  constructor(
      private _parent: Dao,
      ) {
  }

  getMostRecentJob(db: Tnex, taskName: string) {
    return db
        .select(cronLog)
        .where('cronLog_task', '=', val(taskName))
        .orderBy('cronLog_start', 'desc')
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
        });
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

  dropOldJobs(db: Tnex, startCutoff: number) {
    return db
        .del(cronLog)
        .where('cronLog_start', '<', val(startCutoff))
        .run();

    /*
    // This is the "more correct" way to to this -- it guarantees that we leave
    // the most recent completed entry in the log even if it's "too old".
    // However, SQLite doesn't support joins on deletes. Womp.
    return knex('cronLog as c1')
        .del('c1')
        .leftJoin(function() {
          // The most recent completed entry for each task
          this.select('id', 'max(start) as start')
              .from('cronLog')
              .whereNotNull('end')
              .groupBy('task')
              .as('c2')
        }, 'c1.task', '=', 'c2.task')
        .where('c1.start', '<', 'c2.start')
        .andWhere('c1.start', '<', startCutoff);
    */
  }

  getRecentLogs(db: Tnex) {
    return db
        .select(cronLog)
        .orderBy('cronLog_id', 'desc')
        .limit(400)
        .columns(
            'cronLog_id',
            'cronLog_task',
            'cronLog_start',
            'cronLog_end',
            'cronLog_result',
            )
        .run();
  }
}