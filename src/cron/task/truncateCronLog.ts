import { Tnex } from '../../tnex';
import { dao } from '../../dao';
import { JobLogger } from '../Job';


export async function truncateCronLog(db: Tnex, job: JobLogger) {
  await dao.cron.dropOldJobs(db, 10000)
};
