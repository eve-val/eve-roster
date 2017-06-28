import { EventEmitter } from 'events';

import { Job, JobStatus, JobResult, TaskExecutor, } from './Job';

export class JobImpl extends EventEmitter implements Job {
  public readonly executionId: number;
  public readonly taskName: string;
  public readonly executor: TaskExecutor;
  public readonly timeout: number;
  public readonly channel: string | undefined;

  public timeoutId: NodeJS.Timer | undefined;

  private _logId: number | undefined = undefined;
  private _startTime: number | undefined = undefined;
  private _status: JobStatus = 'queued';
  private _result: JobResult | undefined = undefined;
  private _timedOut: boolean | undefined = undefined;

  private _progress: number | undefined = undefined;
  private _progressLabel: string | undefined = undefined;

  constructor(
      executionId: number,
      taskName: string,
      executor: TaskExecutor,
      timeout: number,
      channel: string | undefined) {
    super();

    this.executionId = executionId;
    this.taskName = taskName;
    this.executor = executor;
    this.timeout = timeout;
    this.channel = channel;
  }

  public get logId() {
    return this._logId;
  }

  public set logId(logId: number | undefined) {
    if (this._logId != undefined) {
      throw new Error(`Cannot set the log ID of a job twice.`);
    }
    if (logId == undefined) {
      throw new Error(`logId cannot be undefined`);
    }
    this._logId = logId;
  }

  public get startTime() {
    return this._startTime;
  }

  public set startTime(startTime: number | undefined) {
    if (this._startTime != undefined) {
      throw new Error(`Cannot set the startTime of a job twice.`);
    }
    if (startTime == undefined) {
      throw new Error(`startTime cannot be undefined`);
    }
    this._startTime = startTime;
  }

  public get status() {
    return this._status;
  }

  public set status(status: JobStatus) {
    if (status != this._status) {
      this._status = status;
      this.emit('status', this._status);
    }
  }

  public get result() {
    return this._result || 'pending';
  }

  public set result(value: JobResult) {
    if (this._result != undefined) {
      throw new Error(`Cannot set the result of a job twice.`);
    }
    this._result = value;
  }

  public get timedOut() {
    return this._timedOut || false;
  }

  public set timedOut(timedOut: boolean) {
    if (this._timedOut != undefined) {
      throw new Error(`Cannot set the timed out status of a job twice.`);
    }
    this._timedOut = timedOut;
    if (this._timedOut) {
      this.emit('timeout');
    }
  }

  public get progress() {
    return this._progress;
  }

  public get progressLabel() {
    return this._progressLabel;
  }

  public setProgress(progress: number | undefined, label: string | undefined) {
    if (progress != undefined) {
      progress = Math.min(1, Math.max(0, progress));
    }
    if (progress != this._progress || label != this._progressLabel) {
      this._progress = progress;
      this._progressLabel = label;
      this.emit('progress', this._progress, this._progressLabel);
    }
  }
}
