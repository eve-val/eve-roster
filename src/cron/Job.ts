import Promise = require('bluebird');

import { EventEmitter } from 'events';

export type TaskExecutor = (job: JobTracker) => Promise<ExecutorResult>;
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
  readonly status: JobStatus;
  readonly result: JobResult;
  readonly logId: number | undefined;
  readonly startTime: number | undefined;
  readonly timedOut: boolean;
  readonly progress: number | undefined;
  readonly progressLabel: string | undefined;
}
