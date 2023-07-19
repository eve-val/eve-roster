import moment from "moment";
import { Tnex } from "../../../db/tnex/index.js";
import { JobLogger } from "../../../infra/taskrunner/Job.js";
import { ZKillmailStream } from "../../../data-source/zkillboard/ZKillmailStream.js";
import { pipelinePr } from "../../../util/stream/pipeline.js";
import { formatZKillTimeArgument } from "../../../data-source/zkillboard/formatZKillTimeArgument.js";
import { EsiKillmailFetcher } from "./EsiKillmailFetcher.js";
import { KillmailOrderer } from "./KillmailOrderer.js";
import { KillmailWriter } from "./KillmailWriter.js";

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
  job.setProgress(undefined, `Syncing killmails for corp ${corpId}...`);
  job.info(`  start=${start} (${moment.utc(start).toString()})`);
  job.info(`  end=${end} (${end ? moment.utc(end).toString() : ""})`);

  await db.asyncTransaction(async (db) => {
    await fetchKillmailsInternal(db, job, corpId, start, end);
  });
}

async function fetchKillmailsInternal(
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
  const killmailOrderer = new KillmailOrderer(
    job,
    corpId,
    start,
    end,
    MAX_REORDERING_WINDOW,
  );
  const killmailWriter = new KillmailWriter(db, WRITER_BUFFER_SIZE);

  killmailOrderer.on("exceedBounds", () => {
    zkbStream.close();
    esiFetcher.close();
  });

  await pipelinePr(zkbStream, esiFetcher, killmailOrderer, killmailWriter);

  job.setProgress(undefined, undefined);
  job.info(
    `  Fetched ${esiFetcher.getFetchCount()} killmails,` +
      ` wrote ${killmailWriter.getWriteCount()} killmails.`,
  );
}

function getZkillboardQueryUrl(
  sourceCorporation: number,
  endTime: number | undefined,
) {
  let url = `corporationID/${sourceCorporation}/`;
  if (endTime != undefined) {
    const beforeArg = formatZKillTimeArgument(
      moment.utc(endTime).add(1, "hour"),
    );
    url += `endTime/${beforeArg}/`;
  }
  return url;
}

const ESI_FETCH_CONCURRENCY = 10;
const WRITER_BUFFER_SIZE = 100;

const MAX_REORDERING_WINDOW = moment.duration(5, "minutes").asMilliseconds();
