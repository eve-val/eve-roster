const Promise = require('bluebird');

const dao = require('../../../dao');
const eve = require('../../../eve');

const jsonEndpoint = require('../../../route-helper/jsonEndpoint');
const getStub = require('../../../route-helper/getStub');

const STATIC = require('../../../static-data').get();
const CONFIG = require('../../../config-loader').load();

module.exports = jsonEndpoint(function(req, res, accountId, privs) {
  if (CONFIG.useStubOutput) {
    return Promise.resolve(getStub('character.skills.json'));
  }

  let characterId = req.params.id;

  return dao.getOwner(characterId)
  .then(row => {
    let owningAccount = row != null ? row.id : null;
    privs.requireRead('characterSkills', accountId == owningAccount);
  })
  .then(() => {
    return fetchSkills(characterId);
  })
});

function fetchSkills(characterId) {
  return fetchNewSkills(characterId)
  .then(function() {
    return dao.builder('skillsheet')
        .select('skill', 'level', 'skillpoints')
        .where('character', characterId);
  })
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
    return skillList;
  });
}

function fetchNewSkills(characterId) {
  // TODO make the skill insertion into the table a tap, so that the
  // fetchSkills() function doesn't have to requery them (although this would
  // also involve reformatting the data here to match what DB would return)
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
