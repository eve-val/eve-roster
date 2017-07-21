import Promise = require('bluebird');
import moment = require('moment');

import { Tnex } from '../tnex';

import { Scheduler } from './Scheduler';
import { TaskExecutor } from './Job';
import * as cron from './cron';
import { findWhere } from '../util/underscore';

import { syncKillboard } from './task/syncKillboard';
import { syncLocations } from './task/syncLocations';
import { syncRoster } from './task/syncRoster';
import { syncSiggy } from './task/syncSiggy';
import { syncSkills } from './task/syncSkills';
import { truncateCronLog } from './task/truncateCronLog';
import { truncateLocations } from './task/truncateLocations';

const logger = require('../util/logger')(__filename);


const TASKS: TaskInternal[] = [
  {
    name: 'syncRoster',
    displayName: 'Sync roster',
    description: 'Updates the list of corporation members.',
    executor: syncRoster,
    timeout: moment.duration(5, 'minutes').asMilliseconds(),
  },
  {
    name: 'syncKillboard',
    displayName: 'Sync killboard',
    description: 'Updates members\' recent kills/losses.',
    executor: syncKillboard,
    timeout: moment.duration(30, 'minutes').asMilliseconds(),
  },
  {
    name: 'syncSiggy',
    displayName: 'Sync Siggy',
    description: 'Updates members\' Siggy stats.',
    executor: syncSiggy,
    timeout: moment.duration(30, 'minutes').asMilliseconds(),
  },
  {
    name: 'syncSkills',
    displayName: 'Sync skills',
    description: 'Updates all members\' skillsheets.',
    executor: syncSkills,
    timeout: moment.duration(30, 'minutes').asMilliseconds(),
  },
  {
    name: 'syncLocations',
    displayName: 'Sync locations',
    description: 'Updates all members\' locations.',
    executor: syncLocations,
    timeout:moment.duration(5, 'minutes').asMilliseconds(),
  },
  {
    name: 'truncateLocations',
    displayName: 'Truncate location log',
    description: 'Prunes very old locations.',
    executor: truncateLocations,
    timeout: moment.duration(10, 'minutes').asMilliseconds(),
  },
  {
    name: 'truncateCronLog',
    displayName: 'Truncate cron log',
    description: 'Prunes very old cron logs.',
    executor: truncateCronLog,
    timeout: moment.duration(5, 'minutes').asMilliseconds(),
  },
];

export type TaskName =
    'syncRoster'
    | 'syncKillboard'
    | 'syncSiggy'
    | 'syncSkills'
    | 'syncLocations'
    | 'truncateLocations'
    | 'truncateCronLog'
    ;

export interface Task {
  readonly name: TaskName,
  readonly displayName: string,
  readonly description: string,
}

interface TaskInternal extends Task {
  executor: TaskExecutor,
  timeout: number,
}


let _scheduler: Scheduler;

export function init(db: Tnex, scheduler: Scheduler) {
  _scheduler = scheduler;
}

export function isTaskName(taskName: string): taskName is TaskName {
  return findWhere(TASKS, { name: taskName as TaskName }) != undefined;
}

export function getTasks(): Task[] {
  return TASKS;
}

export function getRunningTasks() {
  return _scheduler.getRunningJobs();
}

export function runTask(taskName: TaskName, channel?: string) {
  if (_scheduler == undefined) {
    throw new Error(`Tasks not yet initialized`);
  }

  let task = findWhere(TASKS, { name: taskName });
  if (task == undefined) {
    throw new Error(`runTask(): No such task "${taskName}".`);
  }
  return _scheduler.runTask(task.name, task.executor, task.timeout, channel);
}
