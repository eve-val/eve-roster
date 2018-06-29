import { Tnex } from '../../tnex';
import { dao } from '../../dao';
import { JobTracker } from '../Job';


export async function truncateCronLog(db: Tnex, job: JobTracker) {
  await dao.cron.dropOldJobs(db, 10000)
};
