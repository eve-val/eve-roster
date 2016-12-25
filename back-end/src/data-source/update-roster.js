const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const util = require('util');

const _ = require('underscore');
const axios = require('axios');
const moment = require('moment');
const xml2js = require('xml2js');

const accountRoles = require('./account-roles');
const async = require('../util/async');
const dao = require('../dao');
const eve = require('../eve');
const CONFIG = require('../config-loader').load();


const allConfigs = CONFIG.primaryCorporations.concat(CONFIG.altCorporations);
const allCorpIds = _.pluck(allConfigs, 'id');

module.exports = updateRoster;

function updateRoster() {
  return updateAllCorporations()
  .then(updateOrphanedCharacters)
  .then(accountRoles.updateAll)
  .then(function() {
    console.log('updateRoster() complete');
  });
}

function updateAllCorporations() {
  console.log('updateAllCorporations');
  return Promise.all(
    allConfigs.map(function(config) {
      return updateCorporation(config);
    })
  )
  .then(function(processedIds) {
    let processedSet = {};
    for (let processedChunk of processedIds) {
      for (let charId of processedChunk) {
        processedSet[charId] = true;
      }
    }
    return processedSet;
  });
}

function updateCorporation(corpConfig) {
  console.log('updateCorporation', corpConfig.id);

  return Promise.all([
    getCorpXml(corpConfig, 'corp/MemberTracking', { extended: 1 }),
    getCorpXml(corpConfig, 'corp/MemberSecurity'),
  ])
  .then(function(results) {
    return parseAndStoreXml(corpConfig.id, results);
  })
}

/**
 * Updates any characters that used to be members of our corporations but which
 * were not present in the most recent roster update.
 */
function updateOrphanedCharacters(processedCharactersIds) {
  console.log('updateOrphanedCharacters');
  return dao.builder('character')
      .select('id', 'corporationId')
      .whereIn('corporationId', allCorpIds)
  .then(function(rows) {
    return async.parallelize(rows, row => {
      if (!processedCharactersIds[row.id]) {
        return eve.esi.character.get(row.id)
        .then(function(character) {
          return dao.updateCharacter(row.id, {
            corporationId: character.corporation_id,
            titles: null,
          });
        })
        .then(function() {
          console.log(
              'Updated orphaned character %s', row.id);
        })
        .catch(function(e) {
          console.error(
              'FAILED to update orphaned character %s', row.id);
          console.error(e);
        });
      }
    });
  });
}

function parseAndStoreXml(corpId, [memberXml, securityXml]) {
  let titlesMap = scrapeTitles(securityXml);

  let members = memberXml.eveapi.result[0].rowset[0].row;
  return async.serialize(members, function(member, i) {
    let characterId = parseInt(member.$.characterID);
    let titles = titlesMap[characterId];

    return dao.upsertCharacter(characterId, member.$.name, corpId, {
      titles: titles != null ? JSON.stringify(titles) : null,
      startDate: moment(member.$.startDateTime + '+00').unix(),
      logonDate: moment(member.$.logonDateTime + '+00').unix(),
      logoffDate: moment(member.$.logoffDateTime + '+00').unix(),
    })
    .then(function() {
      return characterId;
    });
  })
  .then(function(result) {
    console.log('Processed %s members for corp %s', result.length, corpId);
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

function getCorpXml(keyConfig, path, query) {
  let fullpath = util.format(
      'https://api.eveonline.com/%s.xml.aspx?%s',
      path,
      querystring.stringify(
          Object.assign(
              query || {},
              {
                keyID: keyConfig.keyId,
                vCode: keyConfig.vCode,
              }
          )
      )
  );

  return axios.get(fullpath)
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



if (require.main == module) {
  updateRoster()
  .catch(function(e) {
    console.log(e);
  });
}