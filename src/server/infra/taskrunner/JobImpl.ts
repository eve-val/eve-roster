/* global NodeJS */

import { EventEmitter } from "events";

import { Job, JobStatus, JobResult, JobLogger } from "./Job.js";
import { fileURLToPath } from "url";
import { buildLoggerFromFilename } from "../logging/buildLogger.js";
import { LogLevel } from "../logging/Logger.js";
import { Task } from "./Task.js";

const logger = buildLoggerFromFilename(fileURLToPath(import.meta.url));

export class JobImpl extends EventEmitter implements Job, JobLogger {
  public readonly executionId: number;
  public readonly task: Task;
  public readonly channel: string | undefined;
  public readonly silent: boolean;

  public timeoutId: NodeJS.Timer | undefined;

  private _logId: number | undefined = undefined;
  private _startTime: number | undefined = undefined;
  private _status: JobStatus = "queued";
  private _result: JobResult = "pending";
  private _timedOut: boolean | undefined = undefined;

  private _progress: number | undefined = undefined;
  private _progressLabel: string | undefined = undefined;

  public readonly warnings: string[] = [];
  public readonly errors: string[] = [];

  constructor(
    executionId: number,
    task: Task,
    channel: string | undefined,
    silent: boolean,
  ) {
    super();

    this.executionId = executionId;
    this.task = task;
    this.channel = channel;
    this.silent = silent;
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

  public get result() {
    return this._result;
  }

  public setStatus(status: JobStatus, result: JobResult) {
    if (this._status == "finished") {
      throw new Error("Cannot set the status of a finished job.");
    }
    if (result != "pending" && status != "finished") {
      throw new Error(
        `Cannot set job result to ${result} when status is not 'finished'.`,
      );
    }
    this._result = result;

    if (status != this._status) {
      this._status = status;
      this.emit("status", this._status);
    }
  }

  public get timedOut() {
    return this._timedOut ?? false;
  }

  public set timedOut(timedOut: boolean) {
    if (this._timedOut != undefined) {
      throw new Error(`Cannot set the timed out status of a job twice.`);
    }
    this._timedOut = timedOut;
    if (this._timedOut) {
      this.emit("timeout");
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
    if (label != this._progressLabel && label != undefined) {
      logger.info(`[${this.task.name}] ${label}`);
    }
    if (progress != this._progress || label != this._progressLabel) {
      this._progress = progress;
      this._progressLabel = label;
      this.emit("progress", this._progress, this._progressLabel);
    }
  }

  public crit(message: string, error?: Error, data?: object) {
    this.log(LogLevel.CRIT, message, error, data);
  }

  public error(message: string, error?: Error, data?: object) {
    this.log(LogLevel.ERROR, message, error, data);
  }

  public warn(message: string, error?: Error, data?: object): void {
    this.log(LogLevel.WARN, message, error, data);
  }

  public info(message: string, data?: object): void {
    this.log(LogLevel.INFO, message, undefined, data);
  }

  public verbose(message: string, data?: object): void {
    this.log(LogLevel.VERBOSE, message, undefined, data);
  }

  public debug(message: string, data?: object): void {
    this.log(LogLevel.DEBUG, message, undefined, data);
  }

  public log(level: LogLevel, message: string, error?: Error, data?: object) {
    if (level == LogLevel.CRIT || level == LogLevel.ERROR) {
      this.errors.push(message);
    } else if (level == LogLevel.WARN) {
      this.warnings.push(message);
    }
    logger.log(level, `[${this.task.name}] ${message}`, error, data);
  }
}
