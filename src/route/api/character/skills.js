const Promise = require('bluebird');

const MissingTokenError = require('../../../error/MissingTokenError');
const dao = require('../../../dao');
const error = require('../../../util/error');
const eve = require('../../../eve');

const protectedEndpoint = require('../../../route-helper/protectedEndpoint');


const STATIC = require('../../../static-data').get();
const logger = require('../../../util/logger')(__filename);

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  let characterId = req.params.id;

  return dao.getOwner(characterId)
  .then(row => {
    let owningAccount = row != null ? row.id : null;
    privs.requireRead('characterSkills', account.id == owningAccount);
  })
  .then(() => {
    return fetchSkills(characterId);
  })
});

function loadSkillsFromDB(characterId) {
  return dao.builder('skillsheet')
      .select('skill', 'level', 'skillpoints')
      .where('character', characterId)
  .then(function(rows) {
    let skillList = [];
    for (let i = 0; i < rows.length; i++) {
      let row = rows[i];
      skillList.push({
        id: row.skill,
        name: STATIC.SKILLS[row.skill].name,
        group: STATIC.SKILLS[row.skill].groupId,
        level: row.level,
        sp: row.skillpoints,
      });
    }

    return { skills: skillList };
  });
}

function fetchSkills(characterId) {
  return fetchNewSkills(characterId)
  .then(function() {
    return loadSkillsFromDB(characterId);
  })
  .catch(function(err) {
    let esiFailure = error.isAnyEsiError(err);
    if (err instanceof MissingTokenError || esiFailure) {
      // This error is thrown only in fetchNewSkills so execute the DB load
      // that was never reached and wrap the result in a warning message.
      return loadSkillsFromDB(characterId)
      .then(skills => {
        if (esiFailure) {
          skills.warning = 'ESI request failed. Skills are out of date.';
        } else {
          skills.warning = 'Missing access token for character. Skills are out of date.';
        }
        return skills;
      });
    } else {
      // Unknown failure
      throw err;
    }
  })
}

function fetchNewSkills(characterId) {
  // Always store the skills in the DB since it makes the logic around what to
  // do when there's no access token easier (i.e. always read the DB)
  return eve.getAccessToken(characterId)
  .then(accessToken => {
    return eve.esi.characters(characterId, accessToken).skills();
  })
  .then(data => {
    return data.skills;
  })
  .then(esiSkills => {
    return dao.transaction((trx) => {
      logger.debug('Dropping skillsheet...');
      return trx.builder('skillsheet')
      .del()
      .where('character', '=', characterId)
      .then(function() {
        let insertObjs = [];
        for (let i = 0; i < esiSkills.length; i++) {
          let s = esiSkills[i];
          insertObjs.push({
            character: characterId,
            skill: s.skill_id,
            level: s.current_skill_level,
            skillpoints: s.skillpoints_in_skill,
          });
        }
        logger.debug('Inserting %s records', insertObjs.length);

        return trx.batchInsert('skillsheet', insertObjs, 100);
      });
    });
  });
}
