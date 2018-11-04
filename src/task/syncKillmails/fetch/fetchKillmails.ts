import moment = require('moment');
import { Tnex } from '../../../db/tnex';
import { JobLogger } from '../../../infra/taskrunner/Job';
import { ZKillmailStream } from '../../../data-source/zkillboard/ZKillmailStream';
import { pipelinePr } from '../../../util/stream/pipeline';
import { formatZKillTimeArgument } from '../../../data-source/zkillboard/formatZKillTimeArgument';
import { dao } from '../../../db/dao';
import { EsiKillmailFetcher } from './EsiKillmailFetcher';
import { KillmailOrderer } from './KillmailOrderer';
import { KillmailWriter } from './KillmailWriter';

/**
 * Fetches all killmails for a corporation whose timestamps are within the
 * specified range and writes them to the database.
 *
 * Existing killmails within the range will not be touched.
 */
export async function fetchKillmails(
    db: Tnex,
    job: JobLogger,
    corpId: number,
    start: number,
    end: number | undefined,
) {
  const queryUrl = getZkillboardQueryUrl(corpId, end);
  job.info(`  Query: ${queryUrl}`);

  const zkbStream = new ZKillmailStream(queryUrl);
  const esiFetcher = new EsiKillmailFetcher(job, ESI_FETCH_CONCURRENCY);
  const killmailOrderer =
      new KillmailOrderer(job, corpId, start, end, MAX_REORDERING_WINDOW);
  const killmailWriter = new KillmailWriter(db, WRITER_BUFFER_SIZE);

  killmailOrderer.on('exceedBounds', () => {
    zkbStream.close();
    esiFetcher.close();
  });

  await pipelinePr(zkbStream, esiFetcher, killmailOrderer, killmailWriter);

  job.setProgress(undefined, undefined);
  job.info(`  Fetched ${esiFetcher.getFetchCount()} killmails,`
      + ` wrote ${killmailWriter.getWriteCount()} killmails.`);
}

function getZkillboardQueryUrl(
    sourceCorporation: number,
    endTime: number | undefined,
) {

  let url = `corporationID/${sourceCorporation}/`;
  if (endTime != undefined) {
    const beforeArg =
        formatZKillTimeArgument(moment.utc(endTime).add(1, 'hour'));
    url += `endTime/${beforeArg}/`;
  }
  return url;
}

const ESI_FETCH_CONCURRENCY = 10;
const WRITER_BUFFER_SIZE = 100;

const MAX_REORDERING_WINDOW = moment.duration(5, 'minutes').asMilliseconds();
