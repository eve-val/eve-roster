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
import { inspect } from 'util';


/**
 * Downloads and stores any recent killmails for all member and affiliated
 * corporations.
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
    try {
      await syncLossesForCorp(
          db, job, memberCorp.memberCorporation_corporationId);
    } catch (e) {
      job.error(`Error while syncing kills for corp `
          + `${memberCorp.memberCorporation_corporationId}`);
      job.error(inspect(e));
    }
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
  const lastKillmail = await dao.killmail.getMostRecentKillmail(db, corpId);
  const url = getZkillboardQueryUrl(corpId, lastKillmail);

  job.info(`Sync losses for ${corpId}`);
  job.info(`  Query: ${url}`);

  const mails = await fetchZKillmails(url);
  job.info(`  ${mails.length} hits`);

  let newRowCount = 0;

  if (mails.length > 0) {
    const rows =
        killmailsToRows(mails, corpId, CAPSULE_SHIP_ASSOCIATION_WINDOW);
    newRowCount = await dao.killmail.upsertKillmails(db, rows);
  }

  job.info(`  Added ${newRowCount} new killmails`);
}

function getZkillboardQueryUrl(
    sourceCorporation: number, mostRecentStoredMail: Killmail | null) {
  let startTimestamp: Moment;
  if (mostRecentStoredMail == null) {
    startTimestamp = moment().subtract(60, 'days');
  } else {
    // Fetch a day's worth of previous killmails since it may take some time
    // for all mails to get to zkill (CCP asplode, etc.)
    startTimestamp = moment(mostRecentStoredMail.km_timestamp)
        .subtract(1, 'day')
  }

  const sinceArg = formatZKillTimeArgument(startTimestamp);

  return `corporationID/${sourceCorporation}/losses/startTime/${sinceArg}`;
}
