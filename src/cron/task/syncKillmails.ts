import moment = require('moment');

import { Tnex } from "../../tnex";
import { dao } from '../../dao';
import { JobLogger } from '../Job';
import { formatZKillTimeArgument } from '../../data-source/zkillboard/formatZKillTimeArgument';
import { fetchZKillmails } from '../../data-source/zkillboard/fetchZKillmails';
import { killmailsToRows } from './syncKillmails/killmailsToRows';
import { MemberCorporation } from '../../dao/tables';
import { inspect } from 'util';
import { autoTriageLosses } from '../../domain/srp/triage/autoTriageLosses';
import { pluck } from '../../util/underscore';
import { ZKillmail } from '../../data-source/zkillboard/ZKillmail';
import { createPendingBattles } from '../../domain/battle/createPendingBattles';


/**
 * Downloads and stores any recent killmails for all member and affiliated
 * corporations. Also creates SRP entries for each loss, possibly rendering
 * verdicts for some of them if the triage rules dictate it.
 *
 * For new corporations, fetches the last 60 days of losses; for
 * existing corporations, fetches all new losses since the last sync.
 *
 * Uses Zkillboard as a backend.
 */
export async function syncKillmails(db: Tnex, job: JobLogger) {
  const config =
      await dao.config.get(db, 'srpJurisdiction', 'killmailSyncRanges');
  const memberCorps = await dao.config.getMemberCorporations(db);

  if (config.srpJurisdiction == null) {
    return;
  }
  let syncedRanges = config.killmailSyncRanges || {};

  syncedRanges = await syncKillmailsForAllCorps(
      db, job, config.srpJurisdiction, memberCorps, syncedRanges);

  await dao.config.set(db, { 'killmailSyncRanges':  syncedRanges });
  await createSrpEntriesForNewLosses(db);
  await createPendingBattles(db, job);
}

async function syncKillmailsForAllCorps(
    db: Tnex,
    job: JobLogger,
    jurisdiction: { start: number, end: number | undefined },
    memberCorps: MemberCorporation[],
    syncedRanges: { [key: number]: { start: number, end: number }},
) {
  for (let memberCorp of memberCorps) {
    try {
      const corpId = memberCorp.memberCorporation_corporationId;
      syncedRanges[corpId] = await syncLossesForCorp(
          db,
          job,
          memberCorp.memberCorporation_corporationId,
          syncedRanges[corpId],
          jurisdiction,
          );
    } catch (e) {
      job.error(`Error while syncing kills for corp `
          + `${memberCorp.memberCorporation_corporationId}`);
      job.error(inspect(e));
    }
  }

  return syncedRanges;
}

async function syncLossesForCorp(
    db: Tnex,
    job: JobLogger,
    corpId: number,
    syncedRange: { start: number, end: number } | undefined,
    jurisdiction: { start: number, end: number | undefined },
) {

  if (syncedRange == undefined
      || syncedRange.start > jurisdiction.start) {
    job.info(`Performing pre-range fill...`);
    await syncLossesWithinRange(
        db, job, corpId, jurisdiction.start, syncedRange && syncedRange.start);
  }
  if (syncedRange != undefined &&
      (jurisdiction.end == undefined || syncedRange.end < jurisdiction.end)) {
    // Fetch a day's worth of previous killmails since it may take some time
    // for all mails to get to zkill (CCP asplode, etc.)
    const start = moment(syncedRange.end).subtract(1, 'day').valueOf();
    await syncLossesWithinRange(
        db, job, corpId, start, jurisdiction.end);
  }

  return { start: jurisdiction.start, end: Date.now() };
}

async function syncLossesWithinRange(
    db: Tnex,
    job: JobLogger,
    corpId: number,
    start: number,
    end: number | undefined,
) {
  const url =
      getZkillboardQueryUrl(corpId, start - CAPSULE_SHIP_ASSOCIATION_WINDOW);

  job.info(`Sync losses for ${corpId}`);
  job.info(`  Query: ${url}`);

  const mails = await fetchZKillmails(url, {
    maxTimestamp:
        end != undefined ? end + CAPSULE_SHIP_ASSOCIATION_WINDOW : end,
  });
  job.info(`  ${mails.length} hits`);

  let newRowCount = 0;

  if (mails.length > 0) {
    mails.sort(sortKillmailsByTimestamp);
    const rows =
        killmailsToRows(mails, corpId, CAPSULE_SHIP_ASSOCIATION_WINDOW);
    newRowCount = await dao.killmail.upsertKillmails(db, rows);
  }

  job.info(`  Added ${newRowCount} new killmails`);
}

/**
 * Max time between ship loss and capsule loss on the same charactr for us to
 * consider them to be "related".
 */
const CAPSULE_SHIP_ASSOCIATION_WINDOW
    = moment.duration(20, 'minutes').asMilliseconds();

async function createSrpEntriesForNewLosses(db: Tnex) {
  const rows = await dao.srp.listKillmailsMissingSrpEntries(db);
  await dao.srp.createSrpEntries(db, pluck(rows, 'km_id'));
  await autoTriageLosses(db, rows);
}

function getZkillboardQueryUrl(sourceCorporation: number, startTime: number) {
  const sinceArg = formatZKillTimeArgument(moment(startTime));
  return `corporationID/${sourceCorporation}/startTime/${sinceArg}`;
}

function sortKillmailsByTimestamp(a: ZKillmail, b: ZKillmail) {
  const ta = moment.utc(a.killmail_time).valueOf();
  const tb = moment.utc(b.killmail_time).valueOf();
  return ta - tb;
}
