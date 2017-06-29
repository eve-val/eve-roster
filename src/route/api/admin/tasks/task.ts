import Promise = require('bluebird');

import { jsonEndpoint } from '../../../../route-helper/protectedEndpoint';
import { dao } from '../../../../dao';
import { Task, getTasks } from '../../../../cron/tasks';


export type Output = Task[];

export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  privs.requireRead('serverConfig');

  const tasks = getTasks().map(task => ({
    name: task.name,
    displayName: task.displayName,
    description: task.description,
  }));

  return Promise.resolve(tasks);
});
