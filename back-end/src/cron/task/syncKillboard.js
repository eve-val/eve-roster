const dao = require('../../dao');
const CONFIG = require('../../config-loader').load();
const logger = require('../../util/logger')(__filename);

const _ = require('underscore');
const axios = require('axios');
const moment = require('moment');
const Promise = require('bluebird');

let expectedCharCount;

module.exports = function syncKillboard() {
  // clear the cached character count
  expectedCharCount = 0;
  return Promise.resolve()
  .then(resetScores)
  .then(getStartTime)
  .then(fetchAll)
  .then(calcCharacterStats)
  .then(saveStats)
  .then((updateCount) => {
    logger.info('Updated', updateCount, 'characters');
    return updateCount == expectedCharCount ? 'success' : 'partial';
  });
};

function getStartTime() {
  let now = moment.utc([]);
  let start = now.subtract(30, 'days');

  // zKillboard requires start times to end with 00, so add an hour and then
  // round down to the start (this gives us the nextHour:00). The moment
  // endOf function would give us currentHour:59, which is not desired.
  start = start.add(1, 'hour').startOf('hour');

  // zKillboard says start time must be formatted YmdHi (as a PHP datetime) This
  // translates to 4-digit year (YYYY); padded, 1-based month (MM); padded,
  // 1-based day of month (DD); padded, 24 hour clock (HH); padded minutes (mm)
  return start.format('YYYYMMDDHHmm');
}

// Reset all scores to null (null == unknown, differentiated from a 0, which
// implies character access with no known kills)
function resetScores() {
  return dao.transaction((trx) => {
    return trx.builder('character').update({
      killsInLastMonth: null,
      killValueInLastMonth: null,
      lossesInLastMonth: null,
      lossValueInLastMonth: null
    });
  });
}

// Get the value-annotated 30-day history for all known characters.
// Returns an array of objects {id: characterId, kills: [], losses: []}
function fetchAll(since) {
  return dao.getCharacters().then((characters) => {
    expectedCharCount = characters.length;
    return Promise.map(_.pluck(characters, 'id'), (id) => {
      // In conjunction with concurrency: 1 in the map, this delay is a crude
      // way of rate limiting our queries to zkillboard, kill and loss use
      // different delays so that a pair of requests isn't made simultaneously
      let workKills = Promise.delay(500)
      .then(() => fetchMails('kills', id, since));
      let workLosses = Promise.delay(1000)
      .then(() => fetchMails('losses', id, since));

      return Promise.all([workKills, workLosses])
      .then(([kills, losses]) => {
        return {
          id: id,
          kills: kills,
          losses: losses
        };
      });
    }, { concurrency: 1 });
  });
}

function fetchMails(kind, characterID, since) {
  let url = 'https://zkillboard.com/api/' + kind + '/characterID/' + characterID
      + '/startTime/' + since + '/zkbOnly/';
  return axios.get(url, {
    headers: {
      'User-Agent': CONFIG.userAgent
    }
  })
  .then(response => {
    if (!response.data || response.data.error) {
      logger.warn('Unable to fetch', kind, 'for', characterID);
      if (response.data && response.data.error) {
        logger.error(response.data.error);
      }

      return null;
    } else {
      return response.data;
    }
  });
}

// Return an array of all known characters and their kill/loss stats in the last
// 30 days, based on the collected character mails, which is an array from with
// character id to a blob holding a kills array and a losses array of killmails
// from zKillboard.
function calcCharacterStats(characterMails) {
  let characterStats = [];

  for (let forChar of characterMails) {
    let stats = {
      id: forChar.id
    };

    if (forChar.kills) {
      stats.killCount = forChar.kills.length;

      let values = forChar.kills.map(m => m.zkb.totalValue);
      stats.killValue = values.reduce((a, b) => a + b, 0.0);
    } else {
      // There was an error fetching the kills so keep fields null
      stats.killValue = null;
      stats.killCount = null;
    }

    if (forChar.losses) {
      stats.lossCount = forChar.losses.length;

      let values = forChar.losses.map(m => m.zkb.totalValue);
      stats.lossValue = values.reduce((a, b) => a + b, 0.0);
    } else {
      // There was an error fetching the kills so keep fields null
      stats.lossValue = null;
      stats.lossCount = null;
    }

    characterStats.push(stats);
  }

  return characterStats;
}

// Persist character stats into the DB, resolves to total number of updates
function saveStats(characterStats) {
  return dao.transaction((trx) => {
    return Promise.map(characterStats, (stats) => {
      return trx.updateCharacter(stats.id, {
        killsInLastMonth: stats.killCount,
        killValueInLastMonth: stats.killValue,
        lossesInLastMonth: stats.lossCount,
        lossValueInLastMonth: stats.lossValue
      });
    });
  })
  .then((updates) => {
    return updates.reduce((a, b) => a + b, 0);
  });
}
