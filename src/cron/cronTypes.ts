import Promise = require('bluebird');

export type TaskExecutor = () => Promise<ExecutorResult>;
export type ExecutorResult = 'success' | 'partial';
export type JobResult = 'pending' | ExecutorResult | 'failure';

export interface TaskDescriptor {
  name: string,
  executor: TaskExecutor,
  timeout: number,
  interval: number,
  schedule: string,
}
