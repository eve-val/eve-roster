import { EventEmitter } from 'events';
import { Logger } from '../logging/Logger';
import { Task } from './Task';


export type JobResult = 'pending' | 'success' | 'partial' | 'failure';
export type JobStatus = 'queued' | 'running' | 'finished';

export interface JobLogger extends Logger {
  setProgress(progress: number | undefined, label: string | undefined): void;
}

export interface Job extends EventEmitter {
  readonly task: Task;
  readonly executionId: number;
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
