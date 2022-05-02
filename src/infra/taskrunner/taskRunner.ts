import { Scheduler, TaskOptions } from "./Scheduler.js";
import { Task } from "./Task.js";
import { Tnex } from "../../db/tnex/index.js";

/**
 * Global wrapper around a Scheduler instance.
 *
 * Should be refactored away at some point.
 */

let _scheduler: Scheduler;

export function init(db: Tnex) {
  _scheduler = new Scheduler(db);
}

export function getRunningJobs() {
  return _scheduler.getRunningJobs();
}

export function runTask(task: Task, options?: TaskOptions) {
  if (_scheduler == undefined) {
    throw new Error(`Tasks not yet initialized`);
  }

  return _scheduler.runTask(task, options);
}
