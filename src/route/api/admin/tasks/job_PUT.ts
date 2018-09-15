import { jsonEndpoint } from '../../../../infra/express/protectedEndpoint';
import { verify, string, } from '../../../../util/express/schemaVerifier';
import { JobJson } from './job';

import { BadRequestError } from '../../../../error/BadRequestError';
import { findRunnableTaskWithName } from '../../../../task-registry/runnableTasks';
import * as taskRunner from '../../../../infra/taskrunner/taskRunner';


export class Input {
  task = string();
}
const inputSchema = new Input();

export type Output = JobJson;

export default jsonEndpoint(
    async (req, res, db, account, privs): Promise<Output> => {
  privs.requireWrite('serverConfig');

  const input = verify(req.body, inputSchema);

  const task = findRunnableTaskWithName(input.task);
  if (task == undefined) {
    throw new BadRequestError('Bad task name: ' + input.task);
  }

  const job = taskRunner.runTask(task);

  return {
    id: job.executionId,
    task: job.task.name,
    startTime: job.startTime!,
    progress: job.progress || null,
    progressLabel: job.progressLabel || null,
  }
});
