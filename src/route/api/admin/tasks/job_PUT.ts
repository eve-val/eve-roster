import { jsonEndpoint } from '../../../../infra/express/protectedEndpoint';
import { isTaskName, runTask } from '../../../../infra/taskrunner/tasks';
import { verify, string, } from '../../../../route-helper/schemaVerifier';
import { JobJson } from './job';

import { BadRequestError } from '../../../../error/BadRequestError';


export class Input {
  task = string();
}
const inputSchema = new Input();

export type Output = JobJson;

export default jsonEndpoint(
    async (req, res, db, account, privs): Promise<Output> => {
  privs.requireWrite('serverConfig');

  const input = verify(req.body, inputSchema);

  if (!isTaskName(input.task)) {
    throw new BadRequestError('Bad task name: ' + input.task);
  }
  let job = runTask(input.task);
  return {
    id: job.executionId,
    task: job.taskName,
    startTime: job.startTime!,
    progress: job.progress || null,
    progressLabel: job.progressLabel || null,
  }
});
