/**
 * System for scheduling tasks to be run. Tasks are run serially, i.e. only one
 * task can be run at a time. The rest wait in a queue until it's their turn.
 */
import moment = require('moment');
import schedule = require('node-schedule');

import { Tnex } from '../tnex';
import { dao } from '../dao';
import { serialize } from '../util/asyncUtil';
import { TaskName } from './tasks';
import * as tasks from './tasks';

const logger = require('../util/logger')(__filename);


interface TaskSchedule {
  name: TaskName,
  schedule: string,
  interval: number,
  channel?: string,
  silent?: boolean,
}

const CRON_SCHEDULES: TaskSchedule[] = [
  {
    name: 'syncRoster',
    schedule: '*/61 * * * *', // Every 61 minutes
    interval: moment.duration(61, 'minutes').asMilliseconds(),
  },
  {
    name: 'syncCombatStats',
    schedule: '0 2 * * *',  // Once a day at 2AM
    interval: moment.duration(1, 'day').asMilliseconds(),
  },
  {
    name: 'syncKillmails',
    schedule: '0 */2 * * *',  // Every 2 hours
    interval: moment.duration(2, 'hours').asMilliseconds(),
  },
  {
    name: 'syncSiggy',
    schedule: '0 2 * * *',  // Once a day at 2AM
    interval: moment.duration(1, 'day').asMilliseconds(),
  },
  {
    name: 'syncSkills',
    schedule: '0 2 * * *',  // Once a day at 2AM
    interval: moment.duration(1, 'day').asMilliseconds(),
  },
  {
    name: 'syncCorps',
    schedule: '0 2 * * *',  // Once a day at 2AM
    interval: moment.duration(1, 'day').asMilliseconds(),
  },
  {
    name: 'syncCharacterLocations',
    schedule: '*/10 * * * * *', // Every 10 seconds - note the extra *
    interval: moment.duration(10, 'seconds').asMilliseconds(),
    channel: 'location',
    silent: true,
  },
  {
    name: 'truncateCharacterLocations',
    schedule: '0 0 */30 * *',  // Every 30 days
    interval: moment.duration(30, 'days').asMilliseconds(),
  },
  {
    name: 'truncateCronLog',
    schedule: '0 2 * * *',  // Once a day at 2AM
    interval: moment.duration(1, 'day').asMilliseconds(),
  },
  {
    name: 'triagePendingLosses',
    schedule: '0 5 * * *',  // Once a day at 5AM
    interval: moment.duration(1, 'day').asMilliseconds(),
  },
];

export function init(db: Tnex) {
  if (process.env.DEBUG_DISABLE_CRON == 'true') {
    console.warn(`*** WARNING: Cron has been disabled via env flag. ***`);
  } else {
    new Cron(db).init();
  }
}

class Cron {
  private _db: Tnex;

  constructor(db: Tnex) {
    this._db = db;
  }

  public init() {
    serialize(CRON_SCHEDULES, schedule => {
      return this._initTask(schedule);
    });
  }

  private _initTask(task: TaskSchedule) {
    return this._runTaskIfOverdue(task)
    .then(() => {
      schedule.scheduleJob(task.schedule, () => this._runTask(task));
    })
    .catch(e => {
      logger.error('Error while initializing task "%s".', task.name);
      logger.error(e);
    });
  }

  private _runTaskIfOverdue(task: TaskSchedule) {
    return dao.cron.getMostRecentJob(this._db, task.name)
    .then(row => {
      let runTask = row == null
          || row.cronLog_end == null
          || row.cronLog_end + task.interval < Date.now();
      if (runTask) {
        this._runTask(task);
      }
      // Tell Bluebird that we're okay with generating a runaway promise
      return null;
    });
  }

  private _runTask(task: TaskSchedule) {
    tasks.runTask(task.name, {
      channel: task.channel || 'cron',
      silent: task.silent,
    });
  }
}
