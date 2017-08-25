import Promise = require('bluebird');
import moment = require('moment');

import { Tnex } from '../tnex';

import { Scheduler, TaskOptions } from './Scheduler';
import { TaskExecutor } from './Job';
import * as cron from './cron';
import { findWhere } from '../util/underscore';

import { syncKillboard } from './task/syncKillboard';
import { syncCharacterLocations } from './task/syncCharacterLocations';
import { syncRoster } from './task/syncRoster';
import { syncSiggy } from './task/syncSiggy';
import { syncSkills } from './task/syncSkills';
import { syncCorps } from './task/syncCorps';
import { truncateCronLog } from './task/truncateCronLog';
import { truncateCharacterLocations } from './task/truncateCharacterLocations';

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
    name: 'syncCharacterLocations',
    displayName: 'Sync locations',
    description: 'Updates all members\' locations.',
    executor: syncCharacterLocations,
    timeout:moment.duration(10, 'minutes').asMilliseconds(),
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
    name: 'syncCorps',
    displayName: 'Sync corporations',
    description: 'Updates all characters\' corporations.',
    executor: syncCorps,
    timeout:moment.duration(20, 'minutes').asMilliseconds(),
  },
  {
    name: 'truncateCharacterLocations',
    displayName: 'Truncate location log',
    description: 'Prunes very old character locations.',
    executor: truncateCharacterLocations,
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
    | 'syncCharacterLocations'
    | 'syncSiggy'
    | 'syncSkills'
    | 'syncCorps'
    | 'truncateCharacterLocations'
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

export function init(scheduler: Scheduler) {
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

export function runTask(taskName: TaskName, options?: TaskOptions) {
  if (_scheduler == undefined) {
    throw new Error(`Tasks not yet initialized`);
  }

  let task = findWhere(TASKS, { name: taskName });
  if (task == undefined) {
    throw new Error(`runTask(): No such task "${taskName}".`);
  }
  return _scheduler.runTask(task.name, task.executor, task.timeout, options);
}
