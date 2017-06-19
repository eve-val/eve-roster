import Promise = require('bluebird');
import moment = require('moment');

import { Tnex } from '../tnex';

import { Scheduler } from './Scheduler';
import { TaskExecutor } from './cronTypes';
import * as cron from './cron';
import { findWhere } from '../util/underscore';

import { syncKillboard } from './task/syncKillboard';
import { syncRoster } from './task/syncRoster';
import { syncSiggy } from './task/syncSiggy';
import { truncateCronLog } from './task/truncateCronLog';

const logger = require('../util/logger')(__filename);


export const TASKS = [
  {
    name: 'syncRoster',
    executor: syncRoster,
    timeout: moment.duration(5, 'minutes').asMilliseconds(),
    interval: moment.duration(20, 'minutes').asMilliseconds(),
    schedule: '*/20 * * * *', // Every 20 minutes
  },
  {
    name: 'syncKillboard',
    executor: syncKillboard,
    timeout: moment.duration(30, 'minutes').asMilliseconds(),
    interval: moment.duration(1, 'day').asMilliseconds(),
    schedule: '0 2 * * *',  // Once a day at 2AM
  },
  {
    name: 'syncSiggy',
    executor: syncSiggy,
    timeout: moment.duration(30, 'minutes').asMilliseconds(),
    interval: moment.duration(1, 'day').asMilliseconds(),
    schedule: '0 2 * * *',  // Once a day at 2AM
  },
  {
    name: 'truncateCronLog',
    executor: truncateCronLog,
    timeout: moment.duration(5, 'minutes').asMilliseconds(),
    interval: moment.duration(90, 'days').asMilliseconds(),
    schedule: '0 0 */90 * *',  // Every 90 days
  },
];

let _scheduler: Scheduler;

export function init(db: Tnex, scheduler: Scheduler) {
  _scheduler = scheduler;
}

export function isTask(taskName: string) {
  return findWhere(TASKS, { name: taskName }) != undefined;
}

export function runTask(taskName: string) {
  if (_scheduler == undefined) {
    throw new Error(`Tasks not yet initialized`);
  }

  let task = findWhere(TASKS, { name: taskName });
  if (task == undefined) {
    throw new Error(`runTask(): No such task "${taskName}".`);
  }
  _scheduler.runTask(task.name, task.executor, task.timeout);
}
