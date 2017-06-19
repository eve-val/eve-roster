/**
 * System for scheduling tasks to be run. Tasks are run serially, i.e. only one
 * task can be run at a time. The rest wait in a queue until it's their turn.
 */
import Promise = require('bluebird');
import schedule = require('node-schedule');

import { Tnex } from '../tnex';
import { dao } from '../dao';
import { serialize } from '../util/asyncUtil';
import { TaskDescriptor } from './cronTypes';
import { Scheduler } from './Scheduler';

const logger = require('../util/logger')(__filename);

export function init(db: Tnex, scheduler: Scheduler, tasks: TaskDescriptor[]) {
  new Cron(db, scheduler, tasks);
}

class Cron {
  private _db: Tnex;
  private _scheduler: Scheduler;

  constructor(db: Tnex, scheduler: Scheduler, tasks: TaskDescriptor[]) {
    this._db = db;
    this._scheduler = scheduler;

    serialize(tasks, task => {
      return this._initTask(task);
    })
  }

  private _initTask(task: TaskDescriptor) {
    return this._runTaskIfOverdue(task)
    .then(() => {
      schedule.scheduleJob(task.schedule, () => this._runTask(task));
    })
    .catch(e => {
      logger.error('Error while initializing task "%s".', task.name);
      logger.error(e);
    });
  }

  private _runTaskIfOverdue(task: TaskDescriptor) {
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

  private _runTask(task: TaskDescriptor) {
    this._scheduler.runTask(task.name, task.executor, task.timeout, 'cron');
  }
}
