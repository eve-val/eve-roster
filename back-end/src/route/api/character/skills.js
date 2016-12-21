const dao = require('../../../dao');
const esi = require('../../../esi');

const sendStub = require('../send-stub');

const STATIC = require('../../../static-data').get();


const CACHE_SOURCE = 'skills'
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes
const STUB_OUTPUT = false;

module.exports = function(req, res) {
  if (STUB_OUTPUT) {
    sendStub(res, 'character.skills.json');
    return;
  }

  let characterId = req.params.id;

  fetchSkills(characterId)
  .then(function(rows) {
    let skillList = [];
    for (let i = 0; i < rows.length; i++) {
      let row = rows[i];
      skillList.push({
        id: row.skill,
        name: STATIC.SKILLS[row.skill].name,
        level: row.level,
        sp: row.skillpoints,
      });
    }
    let space = req.query.pretty != undefined ? 2 : undefined;

    res.type('json');
    res.send(JSON.stringify(skillList, null, space));
  })
  .catch(function(e) {
    // TODO
    res.status(500);
    res.send('Error :( ' + e.toString());
  });
};

function fetchSkills(characterId) {
  return dao.builder('cacheControl')
      .select('cacheUntil')
      .where({
        character: characterId,
        source: CACHE_SOURCE,
      })
  .then(function([row]) {
    if (row == null || row.cacheUntil < Date.now()) {
      console.log('Skills cache expired, fetching new set...');
      return fetchNewSkills(characterId, row != null);
    } else {
      console.log('Reusing cached skills...');
    }
  })
  .then(function() {
    return dao.builder('skillsheet')
        .select('skill', 'level', 'skillpoints')
        .where('character', characterId);
  });
}

function fetchNewSkills(characterId, cacheEntryExists) {
  let esiSkills;
  
  return esi.getForCharacter(
      'characters/' + characterId + '/skills/', characterId)
  .then(function(response) {
    esiSkills = response.data.skills;
  })
  .then(dao.transaction)
  .then(function(trx) {
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

      return trx.builder('skillsheet').insert(insertObjs);
    })
    .then(function() {
      console.log('Updating cache control...');
      let cacheUntil = Date.now() + CACHE_DURATION;
      if (cacheEntryExists) {
        return trx.builder('cacheControl')
            .update('cacheUntil', cacheUntil)
            .where('character', '=', characterId);
      } else {
        return trx.builder('cacheControl')
            .insert({
              character: characterId,
              source: CACHE_SOURCE,
              cacheUntil: cacheUntil
            });
      }
    })
    .then(function() {
      console.log('Committing!');
      return trx.commit();
    })
    .catch(function(e) {
      trx.rollback();
      throw e;
    });
  })
}