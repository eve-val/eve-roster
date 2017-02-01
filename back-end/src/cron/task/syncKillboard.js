const eve = require('../../eve');
const dao = require('../../dao');
const MissingTokenError = require('../../error/MissingTokenError');

const _ = require('underscore');
const moment = require('moment');
const Promise = require('bluebird');

module.exports = function syncKillboard() {
  // clear the cached market map
  marketMap = null;
  return Promise.resolve()
    .then(resetScores)
    .then(fetchAllKills)
    .then(joinKills)
    .then(calcCharacterStats)
    .then(saveStats)
    .then((updateCount) => {
      console.log('Updated', updateCount, 'characters');
      return 'success';
    });
};

// Reset all scores to null (null == unknown, differentiated from a 0, which implies character access with no
// known kills)
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

// Get the value-annotated 30-day history for all known characters with access tokens.
// Characters without access tokens are not included in the returned array.
// Returns an array of objects {id: characterId, killmails: []}
function fetchAllKills() {
  return dao.getCharacters().then((characters) => {
    return Promise.map(_.pluck(characters, 'id'), (id) => {
      return fetchKillHistory(id)
        .then((kms) => {
          if (kms) {
            return Promise.map(kms, injectKillValue);
          } else {
            return null;
          }
        })
        .then((kms) => {
          return {id: id, killmails: kms};
        });
    });
  })
  .then((charMails) => {
    return charMails.filter(km => km.killmails != null);
  });
}

// Restructure and assign kill mails to all attackers instead of just those with the final blow.
// allKills is an array of objects holding the character 'id' and their loss/final blow history in 'killmails'.
function joinKills(allKills) {
  let characterMap = {};

  // Initialize characterMap key-value pairs for every fetched character, which matches the set of
  // characters we care about (any attacker character id not in the key set will be ignored later on).
  for (let charKills of allKills) {
    characterMap[charKills.id] = {
      kills: [],
      losses: []
    };
  }

  // Push killmail into every related character's tracker
  for (let charKills of allKills) {
    // Either the victim or the attacker with final blow
    let actor = charKills.id;

    for (let km of charKills.killmails) {
      if (km.victim.character_id == actor) {
        // This is a loss for the character
        characterMap[charKills.id].losses.push(km);
      } else {
        // This is a final blow for the character, so record the kill mail in every attacker's tracker
        // since ESI only reports a kill mail to the final blow
        for (let attacker of km.attackers) {
          if (attacker.character_id in characterMap) {
            characterMap[attacker.character_id].kills.push(km);
          } // else attacker is outside of scope so ignore
        }
      }
    }
  }

  return characterMap;
}

// Return an array of all known characters and their kill/loss stats in the last 30 days, based on the
// collected character mails, which is a dictionary from character id to a blob holding a kills array and a losses
// array of killmails annotated with value.
function calcCharacterStats(characterMails) {
  let characterStats = [];

  for (let id in characterMails) {
    if (!characterMails.hasOwnProperty(id))
      continue;

    let mails = characterMails[id];
    let stats = {
      id: id,
      killCount: mails.kills.length,
      lossCount: mails.losses.length,
      killValue: _.pluck(mails.kills, 'value').reduce((a, b) => a + b, 0.0),
      lossValue: _.pluck(mails.losses, 'value').reduce((a, b) => a + b, 0.0)
    };
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

// Get all item prices on the market and organize them into a map from type id to the max of the
// average and adjusted prices, then cache this map
let marketMap = null;
let pendingMarketRequest = null;
function getPriceMap() {
  if (marketMap) {
    return Promise.resolve(marketMap);
  } else if (pendingMarketRequest) {
    return pendingMarketRequest;
  } else {
    console.log('Loading market prices');
    pendingMarketRequest = eve.esi.market.getPrices()
      .then((allPrices) => {
        let priceMap = {};
        for (let item of allPrices) {
          if (item.average_price > item.adjusted_price) {
            priceMap[item.type_id] = item.average_price;
          } else {
            priceMap[item.type_id] = item.adjusted_price;
          }
        }
        marketMap = priceMap;
        pendingMarketRequest = null;
        return marketMap;
      })
      .catch((error) => {
        console.error('Error fetching market prices:');
        console.error(error);
        marketMap = {};
        pendingMarketRequest = null;
        return marketMap;
      });
    return pendingMarketRequest;
  }
}

// Return the killmail as a promise, which will be updated to include a 'value' property storing the result
// of getKillValue().
function injectKillValue(killmail) {
  return getKillValue(killmail)
    .then((value) => {
      killmail.value = value;
      return killmail;
    });
}

// Return the value of the killmail in ISK as a promise
function getKillValue(killmail) {
  return getPriceMap()
    .then((priceMap) => {
      let value = 0.0;
      for (let item of killmail.victim.items) {
        if (priceMap[item.item_type_id]) {
          let itemPrice = priceMap[item.item_type_id];
          let count = 0;
          if (item.quantity_destroyed) {
            count += item.quantity_destroyed;
          }
          if (item.quantity_dropped) {
            count += item.quantity_dropped;
          }

          value += count * itemPrice;
        }
      }

      if (priceMap[killmail.victim.ship_type_id]) {
        value += priceMap[killmail.victim.ship_type_id];
      }

      return value;
    });
}

// Fetch last 30 days history for the character as an array of killmails.
function fetchKillHistory(character) {
  let _fetchHistory = function(character, maxKillmailID) {
    return fetchKills(character, maxKillmailID)
      .then((killmails) => {
        let cutoff = -1;
        for (let i = 0; i < killmails.length; i++) {
          let km = killmails[i];
          let timestamp = moment.utc(km.killmail_time, 'YYYY-MM-DDTHH:mm:ssZ');
          if (moment.utc([]).diff(timestamp, 'days', true) > 30) {
            cutoff = i;
            break;
          }
        }

        if (cutoff >= 0) {
          // Found the end of the 30-day history, so just return the slice up to the cutoff point
          return Promise.resolve(killmails.slice(0, cutoff));
        } else if (killmails.length == 50) {
          // Cutoff wasn't found but we also returned up the limit of killmails in the last request
          // so query again for additional history
          let maxKillID = killmails[killmails.length - 1].killmail_id;
          return _fetchHistory(character, maxKillID)
            .then((olderKills) => {
              return killmails.concat(olderKills);
            });
        } else {
          // End of the history before 30 day limit was reached
          return Promise.resolve(killmails);
        }
      });
  };

  // Initial request has no max kill ID
  return _fetchHistory(character, undefined)
    .catch((error) => {
      console.warn('Unable to fetch kills for', character);
      if (!(error instanceof MissingTokenError)) {
        console.error('Unexpected exception type:');
        console.error(error);
        // Probably best to continue to fail in this case instead of swallowing the error
        throw error;
      }

      // Return null to differentiate between an accessible character that go no kills (e.g. returning [])
      return null;
    });
}

// Loads killmails for the character and denormalizes them to actual killmail data blobs, which includes timestamp.
// maxKillmailID can be undefined to get the most recent kills only.
function fetchKills(character, maxKillmailID) {
  return eve.getAccessToken(character)
    .then((accessToken) => {
      return eve.esi.character.getKillmails(character, accessToken, maxKillmailID);
    })
    .then((killmails) => {
      return Promise.map(killmails, (km) => {
        return eve.esi.killmails.get(km.killmail_id, km.killmail_hash);
      });
    });
}
