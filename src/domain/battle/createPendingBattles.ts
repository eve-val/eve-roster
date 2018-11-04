import moment = require('moment');

import { Tnex } from '../../db/tnex';
import { dao } from '../../db/dao';
import { BatchedObjectReadable } from '../../util/stream/BatchedObjectReadable';
import { BattleCreator } from './BattleCreator';
import { BattleWriter } from './BattleWriter';
import { battle } from '../../db/tables';
import { Logger } from '../../infra/logging/Logger';
import { pipelinePr } from '../../util/stream/pipeline';


/**
 * Iterates through any killmails that aren't associated with battle reports
 * and clusters them into battle reports.
 *
 * Pre-existing battles close to the first killmail may be modified and/or
 * merged with incoming killmails. However, this is only true of battles near
 * the first new killmail. If there are pre-existing battles later on, they
 * won't be touched. In general, this is a rare occurrence that can only be
 * caused by modifying the killmail sync bounds to be deeper into the past.
 * It may result in some battles on the boundary of the update not being
 * properly merged, but it's not a huge deal.
 *
 * Holds a transactional lock on the battles during the entire process.
 */
export async function createPendingBattles(db: Tnex, logger: Logger) {
  return db.asyncTransaction(async db => {
    await db.acquireTransactionalLock(battle, -1);

    const row = await dao.battle.getEarliestUngroupedKillmailTimestamp(db);
    if (row == null) {
      logger.info(`No rows to battle-cluster.`)
      return;
    }

    const initialBattles =
        await dao.battle.getBattlesWithinRange(db,
            row.km_timestamp - WINDOW,
            row.km_timestamp + moment.duration(1, 'hour').asMilliseconds());

    const iterator = dao.battle.getKillmailsWithoutBattlesIterator(db, 300);
    const reader = new BatchedObjectReadable(iterator);
    const creator = new BattleCreator(initialBattles, WINDOW);
    const writer = new BattleWriter(db);

    await pipelinePr(reader, creator, writer);
  });
}

const WINDOW = moment.duration(20, 'minutes').asMilliseconds();
