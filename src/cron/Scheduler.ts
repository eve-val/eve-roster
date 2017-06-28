import { inspect } from 'util';

import Promise = require('bluebird');

import { Tnex } from '../tnex';
import { dao } from '../dao';
import { notNil } from '../util/assert';
import { findWhere, pluck } from '../util/underscore';

import { Job, TaskExecutor } from './Job';
import { JobImpl } from './JobImpl';

const logger = require('../util/logger')(__filename);


let _nextExecutionId = 0;

export class Scheduler {
  private _db: Tnex;
  private _runningJobs = [] as JobImpl[];
  private _channels = new Map<string, JobChannel>();

  constructor(db: Tnex) {
    this._db = db;
  }

  /**
   * Runs a task and logs the result. Returns a `Job` object that can be used
   * to track the progress of the task's execution.
   * 
   * Only one instance of a task can run at a time. If this function is called
   * while a task of the same name is currently running, the Job for that task
   * will be returned (and no new task will be started).
   * 
   * @param taskName Name of the task to run. Can by anything.
   * @param executor Function that performs the task's work.
   * @param timeout Number of milliseconds before task is considered to have
   * timed out.
   * @param channelName Optional. Assigns this job to a particular "channel".
   * Channels can only run one job at a time. If this channel is already busy,
   * the job will be queued until its turn comes up. If a job would be dequeued
   * but a task of the same name is currently running (i.e. in a different
   * channel) then it waits until it can be run.  
   */
  public runTask(
      taskName: string,
      executor: TaskExecutor,
      timeout: number,
      channelName?: string,
      ): Job {
    return this._findRunningJob(taskName)
        || this._findQueuedTaskInChannel(taskName, channelName)
        || this._createAndRunJob(taskName, executor, timeout, channelName);
  }

  public getRunningJobs(): ReadonlyArray<Job> {
    return this._runningJobs;
  }

  private _createAndRunJob(
      taskName: string,
      executor: TaskExecutor,
      timeout: number,
      channelName?: string,
      ) {
    let job = new JobImpl(
        _nextExecutionId, taskName, executor, timeout, channelName);
    _nextExecutionId++;

    if (channelName == undefined) {
      this._executeJob(job);
    } else {
      this._queueJobToChannel(job, this._getChannel(channelName));
    }

    return job;
  }

  private _executeJob(job: JobImpl) {
    if (job.status != `queued`) {
      throw new Error(`Job already executed: ${inspect(job)}.`);
    }
    if (this._isRunning(job.taskName)) {
      throw new Error(`Task ${job.taskName} already running.`);
    }
    this._runningJobs.push(job);

    dao.cron.startJob(this._db, job.taskName)
    .then(jobId => {
      job.logId = jobId;
      job.startTime = Date.now();

      logger.info(`START ${jobSummary(job)}.`);

      const work = job.executor(job);
      job.timeoutId = setTimeout(() => this._timeoutJob(job), job.timeout);
      job.status = 'running';
      return work;
    })
    .catch(e => {
      logger.error(`Error while executing ${jobSummary(job)}.`);
      logger.error(e);
      return 'failure';
    })
    .then(result => {
      const logMessage = `FINISH ${jobSummary(job)} with result "${result}".`;

      if (result == 'success') {
        logger.info(logMessage);
      } else {
        logger.error(logMessage);
      }

      job.result = result;
      if (!job.timedOut) {
        clearTimeout(notNil(job.timeoutId));
      }
      return dao.cron.finishJob(this._db, notNil(job.logId), result);
    })
    .catch(e => {
      logger.error('DB failure when trying to log cron job failure :(');
      logger.error(e);
    })
    .then(() => {
      if (!job.timedOut) {
        this._unregisterJob(job);
        this._tryToUnstallChannels();
      }
      job.status = 'finished';
    });
  }

  private _timeoutJob(job: JobImpl) {
    this._unregisterJob(job);
    job.timedOut = true;
  }

  private _unregisterJob(job: JobImpl) {
    let jobIndex = this._runningJobs.indexOf(job);

    if (jobIndex < 0) {
      throw new Error(`Orphaned job detected. ${inspect(job)}.`);
    }
    this._runningJobs.splice(jobIndex, 1);

    this._removeJobFromChannel(job.channel, job);
    this._tryToUnstallChannels();
  }

  private _getChannel(channelName: string) {
    let channel = this._channels.get(channelName);
    if (channel == undefined) {
      channel = new JobChannel(channelName);
      this._channels.set(channelName, channel);
    }

    return channel;
  }

  private _findRunningJob(taskName: string) {
    return findWhere(this._runningJobs, { taskName: taskName });
  }

  private _isRunning(taskName: string) {
    return this._findRunningJob(taskName) != undefined;
  }

  private _findQueuedTaskInChannel(
      taskName: string, channelName: string | undefined) {
    if (channelName == undefined) {
      return undefined;
    }
    return findWhere(
        this._getChannel(channelName).queue, { taskName: taskName });
  }

  private _queueJobToChannel(job: JobImpl, channel: JobChannel) {
    channel.queue.push(job);
    this._tryRunNextJobInChannel(channel);
    if (channel.runningJob != job) {
      logger.info(`Task ${job.taskName} queued in channel ${channel.name}.`)
    }
  }

  private _tryRunNextJobInChannel(channel: JobChannel) {
    if (channel.runningJob != undefined) {
      // Job already running, no need to unstall
      return;
    }

    for (let i = 0; i < channel.queue.length; i++) {
      let job = channel.queue[i];
      if (!this._isRunning(job.taskName)) {
        channel.queue.splice(i, 1);
        channel.runningJob = job;
        this._executeJob(job);
        break;
      }
    }

    if (channel.runningJob == undefined && channel.queue.length > 0) {
      logger.warn(`Job channel "${channel.name}" has stalled. Queue is`
          + ` [${inspect(pluck(channel.queue, 'taskName'))}].`);
    }
  }

  private _removeJobFromChannel(channelName: string | undefined, job: JobImpl) {
    if (channelName == undefined) {
      return;
    }
    const channel = this._getChannel(channelName);
    if (channel.runningJob == job) {
      channel.runningJob = undefined;
    } else {
      const i = channel.queue.indexOf(job);
      if (i < 0) {
        throw new Error(`Cannot remove job ${inspect(job)} from channel`
            + ` ${inspect(channel)}.`);
      }
      channel.queue.splice(i, 1);
    }
  }

  private _tryToUnstallChannels() {
    for (let channel of this._channels.values()) {
      this._tryRunNextJobInChannel(channel);
    }
  }
}

class JobChannel {
  public readonly name: string;

  public runningJob: JobImpl | undefined;
  public queue = [] as JobImpl[];

  constructor(name: string) {
    this.name = name;
  }
}

function jobSummary(job: JobImpl) {
  return `job "${job.taskName}" (id ${job.executionId}, logId ${job.logId},`
      + ` channel=${job.channel || 'none'})`
}
