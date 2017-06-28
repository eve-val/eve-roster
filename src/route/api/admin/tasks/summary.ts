import Promise = require('bluebird');

import { jsonEndpoint } from '../../../../route-helper/protectedEndpoint';
import { dao } from '../../../../dao';
import { Task, getTasks, getRunningTasks } from '../../../../cron/tasks';

import { JobJson } from './job';
import { LogEntry, getTaskLogs } from './logs';


export interface Output {
  tasks: Task[],
  jobs: JobJson[],
  taskLog: LogEntry[],
}

export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  privs.requireRead('cronLogs', false);
  privs.requireRead('serverConfig');

  const tasks = getTasks().map(task => ({
    name: task.name,
    displayName: task.displayName,
    description: task.description,
  }));

  const jobs = getRunningTasks().map(job => ({
    id: job.executionId,
    task: job.taskName,
    startTime: job.startTime!,
    progress: job.progress || null,
    progressLabel: job.progressLabel || null,
  }));

  return getTaskLogs(db)
  .then(logs => {
    return {
      tasks: tasks,
      jobs: jobs,
      taskLog: logs,
    };
  });
});
