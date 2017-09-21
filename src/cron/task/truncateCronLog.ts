import Promise = require('bluebird');
import moment = require('moment');

import { Tnex } from '../../tnex';
import { dao } from '../../dao';
import { JobTracker } from '../Job';


export function truncateCronLog(
    db: Tnex, job: JobTracker): Promise<void> {
  return dao.cron.dropOldJobs(db, 10000)
  .then(() => {
  });
};
