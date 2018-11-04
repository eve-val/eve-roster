import moment = require('moment');
import { Tnex } from '../../db/tnex';
import { JobLogger } from '../../infra/taskrunner/Job';
import { processNewKillmails } from './process/processNewKillmails';
import { fetchKillmails } from './fetch/fetchKillmails';

/**
 * Syncs and processes all killmails for a corporation within the requested
 * time range.
 */
export async function syncKillmailsForCorpWithinRange(
    db: Tnex,
    job: JobLogger,
    corpId: number,
    start: number,
    end: number | undefined,
) {

  job.setProgress(undefined, `Syncing killmails for corp ${corpId}...`);
  job.info(`  start=${start} (${moment.utc(start).toString()})`);
  job.info(`  end=${end}`
      + (end == undefined ? '' : ` (${moment.utc(end).toString()})`));

  await db.asyncTransaction(async db => {
    await fetchKillmails(db, job, corpId, start, end);
  });
}
