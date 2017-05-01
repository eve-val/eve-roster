const asyncUtil = require('../../util/asyncUtil');
const dao = require('../../dao');
const logger = require('../../util/logger')(__filename);

const _ = require('underscore');
const axios = require('axios');
const moment = require('moment');
const Promise = require('bluebird');

const KB_EXPIRATION_DURATION = moment.duration(12, 'hours').asMilliseconds();
const PROGRESS_INTERVAL_PERC = 0.05;
const ZKILL_MAX_RESULTS_PER_PAGE = 200;
const MAX_FAILURES_BEFORE_BAILING = 10;

module.exports = function syncKillboard() {
  return Promise.resolve()
  .then(getStartTime)
  .then(fetchAll)
  .then(([updateCount, failureCount]) => {
    logger.info(`Updated ${updateCount} characters' killboards.`);
    let result;
    if (failureCount > 0 && updateCount == 0) {
      result = 'failure'
    } else if (failureCount > 0 && updateCount > 0) {
      result = 'partial';
    } else {
      result = 'success';
    }
    return result;
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
function fetchAll(since) {
  return dao.getCharacterKillboardTimestamps()
  .then((rows) => {
    let currentProgress = 0;
    let updateCount = 0;
    let failureCount = 0;
    return asyncUtil.serialize(rows, (row, idx) => {
      if (Date.now() - row.updated < KB_EXPIRATION_DURATION) {
        // Already up-to-date, skip it...
        return;
      }
      currentProgress = logProgressUpdate(currentProgress, idx, rows.length);
      return syncKillboard(row.id, since)
      .then(() => {
        updateCount++;
      })
      .catch(e => {
        logger.warn(`Error fetching killboard for ${row.name}:`, e);
        failureCount++;
        if (failureCount > MAX_FAILURES_BEFORE_BAILING) {
          throw new Error('syncKillboard aborted (failure count too high)');
        }
      });
    })
    .then(() => {
      return [updateCount, failureCount];
    });
  });
}

function syncKillboard(characterId, since) {
  return asyncUtil.serialize(
      ['kills', 'losses'],
      kind => fetchMails(kind, characterId, since)
  )
  .then(([kills, losses]) => {
    let killCount = kills.length;
    let lossCount = losses.length;

    let killValue =
        kills.reduce((accum, kill) => accum + kill.zkb.totalValue, 0);
    let lossValue =
        losses.reduce((accum, loss) => accum + loss.zkb.totalValue, 0);

    return dao.updateCharacterKillboard(
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

function logProgressUpdate(currentProgress, idx, length) {
  let progress = Math.floor(idx / length / PROGRESS_INTERVAL_PERC);
  if (progress > currentProgress || idx == 0) {
    currentProgress = progress;
    const perc = Math.round(100 * currentProgress * PROGRESS_INTERVAL_PERC);
    logger.info(`syncKillboard (${perc}% complete)`);
  }
  return currentProgress;
}

function fetchMails(kind, characterId, since) {
  let mails = [];
  // zKill will paginate results if there are too many, so we need to make sure
  // to fetch all pages.
  return asyncUtil.doWhile(1, page => {
    return fetchMailsPage(kind, characterId, since, page)
    .then(mailsPage => {
      mails = mails.concat(mailsPage);
      if (mailsPage.length >= ZKILL_MAX_RESULTS_PER_PAGE) {
        return page + 1;
      }
    });
  })
  .then(() => {
    return mails;
  });
}

function fetchMailsPage(kind, characterId, since, page) {
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
