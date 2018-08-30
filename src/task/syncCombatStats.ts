import Bluebird = require('bluebird');
import moment = require('moment');
import axios from 'axios';

import { dao } from '../db/dao';
import { Tnex } from '../db/tnex';
import { serialize } from '../util/asyncUtil';
import { JobLogger } from '../infra/taskrunner/Job';
import { formatZKillTimeArgument } from '../data-source/zkillboard/formatZKillTimeArgument';
import { buildLoggerFromFilename } from '../infra/logging/buildLogger';


const logger = buildLoggerFromFilename(__filename);

const KB_EXPIRATION_DURATION = moment.duration(12, 'hours').asMilliseconds();
const PROGRESS_INTERVAL_PERC = 0.05;
const ZKILL_MAX_RESULTS_PER_PAGE = 200;
const MAX_FAILURES_BEFORE_BAILING = 10;

export function syncCombatStats(db: Tnex, job: JobLogger) {
  return Promise.resolve()
  .then(() => formatZKillTimeArgument(moment().subtract(60, 'days')))
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

// For each character, fetches their killboard stats and stores them.
function fetchAll(db: Tnex, job: JobLogger, since: string) {
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
    return Bluebird.delay(500);
  });
}

function logProgressUpdate(
    job: JobLogger, lastLoggedProgress: number, idx: number, length: number) {
  let progress = Math.floor(idx / length / PROGRESS_INTERVAL_PERC);
  if (progress > lastLoggedProgress || idx == 0) {
    const perc = Math.round(100 * lastLoggedProgress * PROGRESS_INTERVAL_PERC);
    logger.info(`syncCombatStats (${perc}% complete)`);
    lastLoggedProgress = progress;
  }
  job.setProgress(idx / length, undefined);
  return lastLoggedProgress;
}

async function fetchMails(kind: string, characterId: number, since: string) {
  let mails = [] as ZkillIncident[];

  let pageIndex = 1;
  while (true) {
    const page = await fetchMailsPage(kind, characterId, since, pageIndex);
    for (let incident of page) {
      mails.push(incident);
    }
    if (page.length >= ZKILL_MAX_RESULTS_PER_PAGE) {
      pageIndex++;
    } else {
      break;
    }
  }
  return mails;
}

function fetchMailsPage(
    kind: string,
    characterId: number,
    since: string,
    page: number,
    ): Bluebird<ZkillIncident[]> {
  let url = `https://zkillboard.com/api/${kind}/characterID/${characterId}`
      + `/startTime/${since}/page/${page}/zkbOnly/`;
  return Bluebird.resolve(axios.get(url, {
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
