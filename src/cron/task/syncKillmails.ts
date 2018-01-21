import Bluebird = require('bluebird');
import axios from 'axios';
import moment = require('moment');
import { Moment } from 'moment';

import { Tnex } from "../../tnex";
import { dao } from '../../dao';
import { JobTracker } from '../Job';
import { Promise } from 'bluebird';
import { setTimeout } from 'timers';
import { ZKillmail } from '../../data-source/zkillboard/ZKillmail';
import { formatZKillTimeArgument } from '../../data-source/zkillboard/formatZkillTimeArgument';
import { KillmailType, HullCategory } from '../../dao/enums';
import { TYPE_CAPSULE, TYPE_CAPSULE_GENOLUTION } from '../../eve/constants/types';
import { fetchZKillmails } from '../../data-source/zkillboard/fetchZkillmails';
import { killmailsToRows } from './syncKillmails/killmailsToRows';
import { Killmail } from '../../dao/tables';


/**
 * Downloads and stores any recent killmails for all member and affiliated
 * corporations. Also generates SRP entries for each new loss and performs some
 * initial triage on them (auto-approve, auto-reject).
 *
 * For new corporations, fetches the last 60 days of losses; for
 * existing corporations, fetches all new losses since the last sync.
 * 
 * Uses Zkillboard as a backend.
 */
export function syncKillmails(db: Tnex, job: JobTracker): Bluebird<void> {
  return Bluebird.resolve(_syncKillmails(db, job));
}

async function _syncKillmails(db: Tnex, job: JobTracker) {
  const memberCorps = await dao.config.getMemberCorporations(db);

  for (let memberCorp of memberCorps) {
    await syncLossesForCorp(
        db, job, memberCorp.memberCorporation_corporationId);
  }
}

/**
 * Max time between ship loss and capsule loss on the same charactr for us to
 * consider them to be "related".
 */
const CAPSULE_SHIP_ASSOCIATION_WINDOW
    = moment.duration(20, 'minutes').asMilliseconds();

async function syncLossesForCorp(
  db: Tnex,
  job: JobTracker,
  corpId: number
) {
  job.info(`Sync losses for ${corpId}`);
  const lastKillmail = await dao.killmail.getMostRecentKillmail(db, corpId);
  job.info(`  Most recent killmail was on `
      + (lastKillmail && lastKillmail.km_timestamp));
  const since = lastKillmail != null
      ? moment(lastKillmail.km_timestamp)
          .subtract(CAPSULE_SHIP_ASSOCIATION_WINDOW, 'milliseconds')
      : moment().subtract(60, 'days');
  const sinceArg = formatZKillTimeArgument(since);
  job.info(`  Fetching starting from ${sinceArg}`);

  let url = `corporationID/${corpId}/losses/startTime/${sinceArg}`;

  const mails = await fetchZKillmails(job, url);
  if (mails.length == 0) {
    return;
  }

  const rows = killmailsToRows(mails, corpId, CAPSULE_SHIP_ASSOCIATION_WINDOW);

  for (let row of rows) {
    await storeKillmail(db, job, row);
  }
}

async function storeKillmail(
    db: Tnex,
    job: JobTracker,
    row: Killmail,
) {
  const killmailStored = await dao.killmail.hasKillmail(db, row.km_id);
  if (!killmailStored) {
    job.info(`  Storing ${row.km_id} ${row.km_data.killmail_time}`);
    await dao.killmail.storeKillmail(db, row);
  } else if (row.km_relatedLoss != null) {
    await dao.killmail.setRelatedLoss(db, row.km_id, row.km_relatedLoss);
  }
}

// TODO: Would be great if this was less fragile in the face of CCP adding new
// capsule types.
function getHullCategory(killmail: ZKillmail) {
  if (killmail.victim.ship_type_id == TYPE_CAPSULE
      || killmail.victim.ship_type_id == TYPE_CAPSULE_GENOLUTION) {
    return HullCategory.CAPSULE;
  } else {
    return HullCategory.SHIP;
  }
}
