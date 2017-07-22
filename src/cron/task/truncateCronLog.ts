import Promise = require('bluebird');
import moment = require('moment');

import { Tnex } from '../../tnex';
import { dao } from '../../dao';
import { JobTracker, ExecutorResult } from '../Job';


export function truncateCronLog(
    db: Tnex, job: JobTracker): Promise<ExecutorResult> {
  return dao.cron.dropOldJobs(db, 10000)
  .then(() => {
    return <ExecutorResult>'success';
  });
};
