import { EventEmitter } from 'events';
import Promise = require('bluebird');

import { Tnex } from '../tnex';


export type TaskExecutor =
    (db: Tnex, job: JobTracker) => Promise<ExecutorResult>;
export type ExecutorResult = 'success' | 'partial';
export type JobResult = 'pending' | ExecutorResult | 'failure';
export type JobStatus = 'queued' | 'running' | 'finished';

export interface JobTracker {
  setProgress(progress: number | undefined, label: string | undefined): void
}

export interface Job extends EventEmitter {
  readonly executionId: number;
  readonly taskName: string;
  readonly channel: string | undefined;
  readonly silent: boolean;
  readonly status: JobStatus;
  /**
   * Set to 'pending' until status is 'finished'.
   */
  readonly result: JobResult;
  readonly logId: number | undefined;
  readonly startTime: number | undefined;
  readonly timedOut: boolean;
  /**
   * Indication of task progress. Some tasks may not define this. Not
   * guaranteed to be monotinically increasing, or to end at 100%.
   */
  readonly progress: number | undefined;
  readonly progressLabel: string | undefined;
}
