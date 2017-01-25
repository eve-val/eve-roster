const Promise = require('bluebird');

const MissingTokenError = require('../../../error/MissingTokenError');
const dao = require('../../../dao');
const eve = require('../../../eve');

const protectedEndpoint = require('../../../route-helper/protectedEndpoint');
const getStub = require('../../../route-helper/getStub');

const STATIC = require('../../../static-data').get();
const CONFIG = require('../../../config-loader').load();

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  if (CONFIG.useStubOutput) {
    return Promise.resolve(getStub('character.skills.json'));
  }

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
    if (err instanceof MissingTokenError) {
      // This error is thrown only in fetchNewSkills so execute the DB load
      // that was never reached and wrap the result in a warning message.
      return loadSkillsFromDB(characterId)
      .then(skills => {
        skills.warning = 'Missing access token for character. Skills are out of date.';
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
    return eve.esi.character.getSkills(characterId, accessToken);
  })
  .then(data => {
    return data.skills;
  })
  .then(esiSkills => {
    return dao.transaction((trx) => {
      console.log('Dropping skillsheet...');
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
        console.log('Inserting %s records', insertObjs.length);

        return trx.batchInsert('skillsheet', insertObjs, 100);
      });
    });
  });
}
