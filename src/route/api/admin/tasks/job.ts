import { jsonEndpoint } from '../../../../express/protectedEndpoint';
import { getRunningTasks } from '../../../../infra/tasks/registration/tasks';

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
