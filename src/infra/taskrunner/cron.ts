/**
 * System for scheduling tasks to be run. Tasks are run serially, i.e. only one
 * task can be run at a time. The rest wait in a queue until it's their turn.
 */
import schedule from "node-schedule";

import { Tnex } from "../../db/tnex/index";
import { dao } from "../../db/dao";
import { serialize } from "../../util/asyncUtil";
import { buildLoggerFromFilename } from "../logging/buildLogger";
import { Task } from "./Task";
import * as taskRunner from "./taskRunner";
import { SCHEDULED_TASKS } from "../../task-registry/scheduledTasks";

const logger = buildLoggerFromFilename(__filename);

export interface TaskSchedule {
  task: Task;
  schedule: string;
  interval: number;
  channel?: string;
  silent?: boolean;
}

export function init(db: Tnex) {
  if (process.env.DEBUG_DISABLE_CRON == "true") {
    logger.warn(`*** WARNING: Cron has been disabled via env flag. ***`);
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
    serialize(SCHEDULED_TASKS, (schedule) => {
      return this._initTask(schedule);
    });
  }

  private _initTask(schedTask: TaskSchedule) {
    return this._runTaskIfOverdue(schedTask)
      .then(() => {
        schedule.scheduleJob(schedTask.schedule, () =>
          this._runTask(schedTask)
        );
      })
      .catch((e) => {
        logger.error(
          `Error while initializing task "${schedTask.task.name}".`,
          e
        );
      });
  }

  private _runTaskIfOverdue(task: TaskSchedule) {
    return dao.cron.getMostRecentJob(this._db, task.task.name).then((row) => {
      const runTask =
        row == null ||
        row.cronLog_end == null ||
        row.cronLog_end + task.interval < Date.now();
      if (runTask) {
        this._runTask(task);
      }
      // Tell Bluebird that we're okay with generating a runaway promise
      return null;
    });
  }

  private _runTask(scheduledTask: TaskSchedule) {
    taskRunner.runTask(scheduledTask.task, {
      channel: scheduledTask.channel || "cron",
      silent: scheduledTask.silent,
    });
  }
}
