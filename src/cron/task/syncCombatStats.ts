import Promise = require('bluebird');
import moment = require('moment');
import axios from 'axios';

import { dao } from '../../dao';
import { Tnex } from '../../tnex';
import { serialize, doWhile } from '../../util/asyncUtil';
import { JobTracker } from '../Job';


const logger = require('../../util/logger')(__filename);

const KB_EXPIRATION_DURATION = moment.duration(12, 'hours').asMilliseconds();
const PROGRESS_INTERVAL_PERC = 0.05;
const ZKILL_MAX_RESULTS_PER_PAGE = 200;
const MAX_FAILURES_BEFORE_BAILING = 10;

export function syncCombatStats(db: Tnex, job: JobTracker): Promise<void> {
  return Promise.resolve()
  .then(getStartTime)
  .then(startTime => fetchAll(db, job, startTime))
  .then(([updateCount, failureCount]) => {
    logger.info(`Updated ${updateCount} characters' killboards.`);
    if (failureCount > 0 && updateCount == 0) {
      throw new Error(`syncCombatStats failed completely.`);
    } else if (failureCount > 0 && updateCount > 0) {
      job.warn(`Failed to update ${failureCount} character killboards.`)
    }
  });
};

function getStartTime() {
  let now = moment.utc([]);
  let start = now.subtract(60, 'days');

  // zKillboard requires start times to end with 00, so add an hour and then
  // round down to the start (this gives us the nextHour:00). The moment
  // endOf function would give us currentHour:59, which is not desired.
  start = start.add(1, 'hour').startOf('hour');

  // zKillboard says start time must be formatted YmdHi (as a PHP datetime) This
  // translates to 4-digit year (YYYY); padded, 1-based month (MM); padded,
  // 1-based day of month (DD); padded, 24 hour clock (HH); padded minutes (mm)
  return start.format('YYYYMMDDHHmm');
}

// For each character, fetches their killboard stats and stores them.
function fetchAll(db: Tnex, job: JobTracker, since: string) {
  return dao.combatStats.getAllCharacterCombatStatsTimestamps(db)
  .then(rows => {
    let currentProgress = 0;
    let updateCount = 0;
    let failureCount = 0;
    return serialize(rows, (row, idx) => {
      const updated = row.cstats_updated || 0;
      if (Date.now() - updated < KB_EXPIRATION_DURATION) {
        // Already up-to-date, skip it...
        return;
      }
      currentProgress =
          logProgressUpdate(job, currentProgress, idx, rows.length);
      return syncCharacterKillboard(
          db, row.character_id, row.character_name, since)
      .then(() => {
        updateCount++;
      })
      .catch(e => {
        logger.warn(`Error fetching killboard for ${row.character_name}:`, e);
        failureCount++;
        if (failureCount > MAX_FAILURES_BEFORE_BAILING) {
          throw new Error('syncCombatStats aborted (failure count too high)');
        }
      });
    })
    .then(() => {
      return [updateCount, failureCount];
    });
  });
}

function syncCharacterKillboard(
    db: Tnex, characterId: number, characterName: string, since: string) {
  return serialize(
      ['kills', 'losses'],
      kind => fetchMails(kind, characterId, since)
  )
  .then(([kills, losses]) => {
    let killCount = kills.length;
    let lossCount = losses.length;

    let killValue =
        Math.round(
            kills.reduce((accum, kill) => accum + kill.zkb.totalValue, 0));
    let lossValue =
        Math.round(
            losses.reduce((accum, loss) => accum + loss.zkb.totalValue, 0));

    return dao.combatStats.updateCharacterCombatStats(
        db,
        characterId,
        killCount,
        lossCount,
        killValue,
        lossValue);
  })
  .then(() => {
    // Add another delay to avoid spamming zKill too much
    return Promise.delay(500);
  });
}

function logProgressUpdate(
    job: JobTracker, lastLoggedProgress: number, idx: number, length: number) {
  let progress = Math.floor(idx / length / PROGRESS_INTERVAL_PERC);
  if (progress > lastLoggedProgress || idx == 0) {
    const perc = Math.round(100 * lastLoggedProgress * PROGRESS_INTERVAL_PERC);
    logger.info(`syncCombatStats (${perc}% complete)`);
    lastLoggedProgress = progress;
  }
  job.setProgress(idx / length, undefined);
  return lastLoggedProgress;
}

function fetchMails(kind: string, characterId: number, since: string) {
  let mails = [] as ZkillIncident[];
  // zKill will paginate results if there are too many, so we need to make sure
  // to fetch all pages.
  return doWhile(1, page => {
    return fetchMailsPage(kind, characterId, since, page)
    .then(mailsPage => {
      for (let incident of mailsPage) {
        mails.push(incident);
      }
      // mails = mails.concat(mailsPage);
      if (mailsPage.length >= ZKILL_MAX_RESULTS_PER_PAGE) {
        return page + 1;
      }
    });
  })
  .then(() => {
    return mails;
  });
}

function fetchMailsPage(
    kind: string,
    characterId: number,
    since: string,
    page: number,
    ): Promise<ZkillIncident[]> {
  let url = `https://zkillboard.com/api/${kind}/characterID/${characterId}`
      + `/startTime/${since}/page/${page}/zkbOnly/`;
  return Promise.resolve(axios.get(url, {
    headers: {
      'User-Agent': process.env.USER_AGENT || 'Sound Roster App',
      'Accept-Encoding': 'gzip',
    }
  }))
  // Add a delay here in order to prevent going over zKill's API limit.
  .delay(500)
  .then(response => {
    if (!response.data || response.data.error) {
      let errorMessage = response.data && response.data.error;
      throw new Error(
          `Unable to fetch ${kind} for ${characterId}: ${errorMessage}`);
    }
    return response.data;
  });
}

interface ZkillIncident {
  killID: number,
  zkb: {
    locationID: number,
    hash: string,
    totalValue: number,
    points: number,
    npc: boolean,
  },
}
