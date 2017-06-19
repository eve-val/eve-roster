import { inspect } from 'util';

import Promise = require('bluebird');

import { Tnex } from '../tnex';
import { dao } from '../dao';
import { notNil } from '../util/assert';
import { findWhere, pluck } from '../util/underscore';

import { TaskExecutor, ExecutorResult, JobResult, } from './cronTypes';
import { Job } from './Job';

const logger = require('../util/logger')(__filename);


export class Scheduler {
  private _db: Tnex;
  private _runningJobs = new Map<string, Job>();
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
    return this._runningJobs.get(taskName)
        || this._findQueuedTaskInChannel(taskName, channelName)
        || this._createAndRunJob(taskName, executor, timeout, channelName);
  }

  private _createAndRunJob(
      taskName: string,
      executor: TaskExecutor,
      timeout: number,
      channelName?: string,
      ) {

    let job = new Job(taskName, executor, timeout, channelName);

    if (channelName == undefined) {
      this._executeJob(job);
    } else {
      this._queueJobToChannel(job, this._getChannel(channelName));
    }

    return job;
  }

  private _executeJob(job: Job) {
    if (job.id != undefined) {
      throw new Error(`Job already executed: ${inspect(job)}.`);
    }
    if (this._runningJobs.has(job.taskName)) {
      throw new Error(`Task ${job.taskName} already running.`);
    }
    this._runningJobs.set(job.taskName, job);

    dao.cron.startJob(this._db, job.taskName)
    .then(jobId => {
      job.id = jobId;

      logger.info(`START task "${job.taskName}" (job ${job.id})`
          + ` channel=${job.channel}`);

      const work = job.executor();
      job.timeoutId = setTimeout(() => this._timeoutJob(job), job.timeout);
      job.status = 'running';
      return work;
    })
    .catch(e => {
      logger.error(`Error while executing task "${job.taskName}" (${job.id}}.`);
      logger.error(e);
      return 'failure';
    })
    .then(result => {
      const logMessage = `FINISH task "${job.taskName}" (job ${job.id}) with`
          + ` result "${result}".`;

      if (result == 'success') {
        logger.info(logMessage);
      } else {
        logger.error(logMessage);
      }

      job.result = result;
      if (!job.timedOut) {
        clearTimeout(notNil(job.timeoutId));
      }
      return dao.cron.finishJob(this._db, notNil(job.id), result);
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

  private _timeoutJob(job: Job) {
    this._unregisterJob(job);
    job.timedOut = true;
  }

  private _unregisterJob(job: Job) {
    if (this._runningJobs.get(job.taskName) != job) {
      throw new Error(`Orphaned job detected. ${inspect(job)}.`);
    }
    this._runningJobs.delete(job.taskName);

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

  private _findQueuedTaskInChannel(
      taskName: string, channelName: string | undefined) {
    if (channelName == undefined) {
      return undefined;
    }
    return findWhere(
        this._getChannel(channelName).queue, { taskName: taskName });
  }

  private _queueJobToChannel(job: Job, channel: JobChannel) {
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
      if (!this._runningJobs.has(job.taskName)) {
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

  private _removeJobFromChannel(channelName: string | undefined, job: Job) {
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

  public runningJob: Job | undefined;
  public queue = [] as Job[];

  constructor(name: string) {
    this.name = name;
  }
}