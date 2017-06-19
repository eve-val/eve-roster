import Promise = require('bluebird');

import { jsonEndpoint } from '../../../route-helper/protectedEndpoint';
import { stringParam } from '../../../route-helper/paramVerifier';
import { TASKS, isTask, runTask } from '../../../cron/tasks';

import { BadRequestError } from '../../../error/BadRequestError';

export default jsonEndpoint((req, res, db, account, privs) => {
  return Promise.try(() => {
    const taskName = stringParam(req, 'task');

    privs.requireWrite('cronLogs');

    if (!isTask(taskName)) {
      throw new BadRequestError('Bad task name: ' + taskName);
    }

    if (runTask(taskName)) {
      return {};
    } else {
      return { warning: 'Task is already in queue.' };
    }
  });
});
