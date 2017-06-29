import Promise = require('bluebird');

import { jsonEndpoint } from '../../../../route-helper/protectedEndpoint';
import { dao } from '../../../../dao';
import { getRunningTasks } from '../../../../cron/tasks';

export type Output = JobJson[];


export interface JobJson {
  id: number,
  task: string,
  startTime: number,
  progress: number | null,
  progressLabel: string | null,
}

export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  privs.requireRead('serverConfig');

  const jobs = getRunningTasks().map(job => ({
    id: job.executionId,
    task: job.taskName,
    startTime: job.startTime!,
    progress: job.progress || null,
    progressLabel: job.progressLabel || null,
  }));

  return Promise.resolve(jobs);
});
