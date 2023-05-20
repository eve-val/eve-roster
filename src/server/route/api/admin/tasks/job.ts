import { jsonEndpoint } from "../../../../infra/express/protectedEndpoint.js";
import * as taskRunner from "../../../../infra/taskrunner/taskRunner.js";

export type Output = JobJson[];

export interface JobJson {
  id: number;
  task: string;
  startTime: number;
  progress: number | null;
  progressLabel: string | null;
}

export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  privs.requireRead("serverConfig");

  const jobs = taskRunner.getRunningJobs().map((job) => ({
    id: job.executionId,
    task: job.task.name,
    startTime: job.startTime!,
    progress: job.progress || null,
    progressLabel: job.progressLabel || null,
  }));

  return Promise.resolve(jobs);
});
