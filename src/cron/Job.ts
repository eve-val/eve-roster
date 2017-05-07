import { EventEmitter } from 'events';

import { TaskExecutor, JobResult, } from './cronTypes';


export type JobStatus = 'queued' | 'running' | 'finished';

export class Job extends EventEmitter {
  public readonly taskName: string;
  public readonly executor: TaskExecutor;
  public readonly timeout: number;
  public readonly channel: string | undefined;

  public timeoutId: NodeJS.Timer | undefined;

  private _id: number | undefined = undefined;
  private _status: JobStatus = 'queued';
  private _result: JobResult | undefined = undefined;
  private _timedOut: boolean | undefined = undefined;

  constructor(
      taskName: string,
      executor: TaskExecutor,
      timeout: number,
      channel: string | undefined) {
    super();

    this.taskName = taskName;
    this.executor = executor;
    this.timeout = timeout;
    this.channel = channel;
  }

  public get id() {
    return this._id;
  }

  public set id(id: number | undefined) {
    if (this._id != undefined) {
      throw new Error(`Cannot set the ID of a job twice.`);
    }
    if (id == undefined) {
      throw new Error(`id cannot be undefined`);
    }
    this._id = id;
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
}
