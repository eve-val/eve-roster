import Promise = require('bluebird');
import moment = require('moment');

import { db as rootDb } from '../../db';
import { Tnex, DEFAULT_NUM } from '../../tnex';
import { dao } from '../../dao';
import { ExecutorResult } from '../Job';


export function truncateCronLog(): Promise<ExecutorResult> {
  return dao.cron.dropOldJobs(rootDb, 10000)
  .then(() => {
    return <ExecutorResult>'success';
  });
};
