/**
 * Fetches rosters of all member corps and updates roster data as appropriate.
 * Also grants/revokes all title- and membership-derived roles for all accounts.
 * 
 * This script can be run from the command line:
 * `$ node src/cron/syncRoster.js`
 */

const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const util = require('util');
const Promise = require('bluebird');

const _ = require('underscore');
const axios = require('axios');
const moment = require('moment');
const xml2js = require('xml2js');

const accountRoles = require('../../data-source/accountRoles');
const asyncUtil = require('../../util/asyncUtil');
const dao = require('../../dao');
const eve = require('../../eve');
const logger = require('../../util/logger')(__filename);


module.exports = syncRoster;

function syncRoster() {
  return updateAllCorporations()
  .then(updateOrphanedOrUnknownCharacters)
  .then(() => accountRoles.updateAll(dao))
  .then(function() {
    logger.info('syncRoster() complete');
    return 'success';
  });
}

function updateAllCorporations() {
  logger.info('updateAllCorporations');
  return dao.getMemberCorporations()
  .then(rows => {
    return asyncUtil.serialize(rows, row => {
      return updateCorporation(row);
    });
  })
  .then(function(corpResults) {
    return new Set([].concat(...corpResults));
  });
}

function updateCorporation(corpConfig) {
  logger.info('updateCorporation', corpConfig.corporationId);

  return Promise.all([
    getCorpXml(corpConfig, 'corp/MemberTracking', { extended: 1 }),
    getCorpXml(corpConfig, 'corp/MemberSecurity'),
  ])
  .then(function(results) {
    return parseAndStoreXml(corpConfig.corporationId, results);
  })
}

/**
 * Updates any characters that used to be members of our corporations but which
 * were not present in the most recent roster update.
 */
function updateOrphanedOrUnknownCharacters(processedCharactersIds) {
  logger.info('updateOrphanedOrUnknownCharacters');
  return dao.builder('memberCorporation as memberCorp')
      .select('character.id', 'character.corporationId')
      .join('character',
          'character.corporationId', '=', 'memberCorp.corporationId')
  .then(function(rows) {
    return asyncUtil.parallelize(rows, row => {
      if (!processedCharactersIds.has(row.id)) {
        return Promise.resolve()
        .then(() => {
          return dao.updateCharacter(row.id, {
            corporationId: null,
            titles: null,
          })
        })
        .then(() => {
          return eve.esi.characters(row.id).info()
        })
        .then(function(character) {
          return dao.updateCharacter(row.id, {
            corporationId: character.corporation_id,
          });
        })
        .then(function() {
          logger.info(
              'Updated orphaned character %s', row.id);
        })
        .catch(function(e) {
          logger.error(
              'FAILED to update orphaned character %s', row.id);
          logger.error(e);
        });
      }
    });
  });
}

function parseAndStoreXml(corpId, [memberXml, securityXml]) {
  let titlesMap = scrapeTitles(securityXml);

  let members = memberXml.eveapi.result[0].rowset[0].row;
  return asyncUtil.serialize(members, function(member, i) {
    let characterId = parseInt(member.$.characterID);
    let titles = titlesMap[characterId];

    return dao.upsertCharacter(characterId, member.$.name, {
      titles: titles != null ? JSON.stringify(titles) : null,
      corporationId: corpId,
      startDate: moment(member.$.startDateTime + '+00').valueOf(),
      logonDate: moment(member.$.logonDateTime + '+00').valueOf(),
      logoffDate: moment(member.$.logoffDateTime + '+00').valueOf(),
    })
    .then(function() {
      return characterId;
    });
  })
  .then(function(result) {
    logger.info('Processed %s members for corp %s', result.length, corpId);
    return result;
  });
}

function scrapeTitles(securityXml) {
  let titlesMap = {};

  let members = securityXml.eveapi.result[0].rowset[0].row;
  for (let member of members) {
    for (let row of member.rowset) {
      if (row.$.name == 'titles') {
        let characterId = parseInt(member.$.characterID);
        let titles = [];
        if (row.row) {
          for (let title of row.row) {
            titles.push(title.$.titleName);
          }
        }
        titlesMap[characterId] = titles;
      }
    }
  }

  return titlesMap;
}

function getCorpXml(corpConfig, path, query) {
  let fullpath = util.format(
      'https://api.eveonline.com/%s.xml.aspx?%s',
      path,
      querystring.stringify(
          Object.assign(
              query || {},
              {
                keyID: corpConfig.apiKeyId,
                vCode: corpConfig.apiVerificationCode,
              }
          )
      )
  );

  return axios.get(fullpath, {
    headers: {
      'User-Agent': process.env.USER_AGENT || 'Sound Roster App'
    }
  })
  .then(function(response) {
    return parseXml(response.data);
  });
}

function parseXml(xmlStr) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xmlStr, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}
