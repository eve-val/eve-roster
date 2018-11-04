import moment = require('moment');
import { Tnex } from '../../../db/tnex';
import { BatchedObjectReadable } from '../../../util/stream/BatchedObjectReadable';
import { dao } from '../../../db/dao';
import { pipelinePr } from '../../../util/stream/pipeline';
import { KillmailAssociator } from './KillmailAssociator';
import { KillmailProcessor } from './KillmailProcessor';
import { JobLogger } from '../../../infra/taskrunner/Job';

/**
 * Processes any killmails whose "processed" column is false
 *
 * Associates them with a possible related loss, creates SRP entries if
 * necessary, and autotriages them if possible.
 */
export async function processNewKillmails(db: Tnex, log: JobLogger) {
  // TODO: Consider scoping this to just the target corp...

  const first = await dao.killmail.getEarliestUnprocessedKillmail(db);
  if (first == null) {
    log.info(`No new killmails to process.`);
    return;
  }

  const preWindowStart = first.km_timestamp - CAPSULE_SHIP_ASSOCIATION_WINDOW;
  const preWindowEnd = first.km_timestamp;

  const killmailStream =
      new BatchedObjectReadable(
          dao.killmail.getUnprocessedKillmailIterator(
              db,
              BATCH_SIZE,
              preWindowStart,
              preWindowEnd,
              ),
          );
  const associator = new KillmailAssociator(CAPSULE_SHIP_ASSOCIATION_WINDOW);
  const updater = new KillmailProcessor(db, 100);

  await pipelinePr(killmailStream, associator, updater);

  log.info(`Processed ${updater.getProcessedCount()} killmails`);
  log.info(`  Created ${updater.getSrpCount()} SRP entries`);
}

/**
 * Max time between ship loss and capsule loss on the same charactr for us to
 * consider them to be "related".
 */
const CAPSULE_SHIP_ASSOCIATION_WINDOW
    = moment.duration(20, 'minutes').asMilliseconds();

const BATCH_SIZE = 50;
