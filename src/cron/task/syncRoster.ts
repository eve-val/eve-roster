/**
 * Fetches rosters of all member corps and updates roster data as appropriate.
 * Also grants/revokes all title- and membership-derived groups for all
 * accounts.
 * 
 * This script can be run from the command line:
 * `$ node src/cron/syncRoster.js`
 */
import querystring = require('querystring');
import util = require('util');

import Promise = require('bluebird');
import axios from 'axios';
import moment = require('moment');
import xml2js = require('xml2js');

import { Tnex, DEFAULT_NUM } from '../../tnex';
import { dao } from '../../dao';
import { MemberCorporation } from '../../dao/tables';
import { serialize, parallelize } from '../../util/asyncUtil';
import { UNKNOWN_CORPORATION_ID } from '../../util/constants';
import { updateGroupsOnAllAccounts } from '../../data-source/accountGroups';
import { JobTracker, ExecutorResult } from '../Job';

import esi from '../../esi';

const logger = require('../../util/logger')(__filename);


type Xml = any;

export function syncRoster(db: Tnex, job: JobTracker): Promise<ExecutorResult> {
  return updateAllCorporations(db)
  .then(processedIds => updateOrphanedOrUnknownCharacters(db, processedIds))
  .then(() => updateGroupsOnAllAccounts(db))
  .then(function() {
    logger.info('syncRoster() complete');
    return <ExecutorResult>'success';
  });
}

function updateAllCorporations(db: Tnex) {
  logger.info('updateAllCorporations');
  return dao.config.getMemberCorporations(db)
  .then(rows => {
    return serialize(rows, row => {
      return updateCorporation(db, row);
    });
  })
  .then(corpResults => {
    return new Set(([] as number[]).concat(...corpResults));
  });
}

function updateCorporation(db: Tnex, corpConfig: MemberCorporation) {
  logger.info('updateCorporation', corpConfig.memberCorporation_corporationId);

  return Promise.all([
    getCorpXml(corpConfig, 'corp/MemberTracking', { extended: 1 }),
    getCorpXml(corpConfig, 'corp/MemberSecurity'),
  ])
  .then(results => {
    return parseAndStoreXml(
        db, corpConfig.memberCorporation_corporationId, results);
  })
  .catch(e => {
    if (e.response) {
      logger.error(`ESI responded with ${e.response.status} when`
          + ` processing corp ${corpConfig.memberCorporation_corporationId}.`
          + ` Has the corp key expired?`)
    } else {
      throw e;
    }
  });
}

/**
 * Updates any characters that used to be members of our corporations but which
 * were not present in the most recent roster update.
 */
function updateOrphanedOrUnknownCharacters(
    db: Tnex, processedCharactersIds: Set<number>) {
  logger.info('updateOrphanedOrUnknownCharacters');
  return dao.character.getMemberCharacters(db)
  .then(function(rows) {
    return parallelize(rows, row => {
      if (!processedCharactersIds.has(row.character_id)) {
        return Promise.resolve()
        .then(() => {
          return dao.character.updateCharacter(db, row.character_id, {
            character_corporationId: UNKNOWN_CORPORATION_ID,
            character_titles: null,
          })
        })
        .then(() => {
          return esi.characters(row.character_id).info()
        })
        .then(character => {
          return dao.character.updateCharacter(db, row.character_id, {
            character_corporationId: character.corporation_id,
          });
        })
        .then(function() {
          logger.info(
              'Updated orphaned character %s', row.character_id);
        })
        .catch(function(e) {
          logger.error(
              'FAILED to update orphaned character %s', row.character_id);
          logger.error(e);
        });
      }
    });
  });
}

function parseAndStoreXml(
    db: Tnex, corpId: number, [memberXml, securityXml]: Xml[]) {
  let titlesMap = scrapeTitles(securityXml);

  let members = memberXml.eveapi.result[0].rowset[0].row as any[];
  return serialize(members, (member, i) => {
    let characterId = parseInt(member.$.characterID);
    let titles = titlesMap[characterId];

    return dao.character.upsertCharacter(db, {
      character_id: characterId,
      character_name: member.$.name,
      character_corporationId: corpId,
      character_titles: titles != null ? JSON.stringify(titles) : null,
      character_startDate: moment(member.$.startDateTime + '+00').valueOf(),
      character_logonDate: moment(member.$.logonDateTime + '+00').valueOf(),
      character_logoffDate: moment(member.$.logoffDateTime + '+00').valueOf(),
      character_siggyScore: DEFAULT_NUM,
    })
    .then(() => {
      return characterId;
    });
  })
  .then(charIds => {
    logger.info('Processed %s members for corp %s', charIds.length, corpId);
    return charIds;
  });
}

function scrapeTitles(securityXml: Xml) {
  let titlesMap = {} as { [key: number]: string[] };

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

function getCorpXml(
    corpConfig: MemberCorporation,
    path: string,
    query?: { [key: string]: any },
    ) {
  let fullpath = util.format(
      'https://api.eveonline.com/%s.xml.aspx?%s',
      path,
      querystring.stringify(
          Object.assign(
              query || {},
              {
                keyID: corpConfig.memberCorporation_apiKeyId,
                vCode: corpConfig.memberCorporation_apiVerificationCode,
              }
          )
      )
  );

  return axios.get(fullpath, {
    headers: {
      'User-Agent': process.env.USER_AGENT || 'Sound Roster App'
    }
  })
  .then(response => {
    return parseXml(response.data);
  });
}

function parseXml(xmlStr: string): Promise<Xml> {
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
