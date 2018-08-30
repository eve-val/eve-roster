import { Tnex } from '../tnex';
import { dao } from '../db/dao';
import { JobLogger } from '../infra/tasks/Job';


export async function truncateCronLog(db: Tnex, job: JobLogger) {
  await dao.cron.dropOldJobs(db, 10000)
};
