const dao = require('../../../dao');
const eve = require('../../../eve');

const sendStub = require('../send-stub');
const skillQueue = require('../../../data-source/skill-queue');
const timeUtil = require('../../../data-source/time-util');

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

  Promise.all([
    fetchQueue(characterId),
    fetchSkills(characterId),
  ])
  .then(function([queue, skills]) {
    return {
      queue: queue,
      skills: skills,
    };
  })
  .then(function(response) {
    let space = req.query.pretty != undefined ? 2 : undefined;

    res.type('json');
    res.send(JSON.stringify(response, null, space));
  })
  .catch(function(e) {
    // TODO
    res.status(500);
    res.send('<pre>' + e.stack + '</pre>');
    console.log(e);
  });
};

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
  // TODO make the skill insertion into the table a tap, so that the fetchSkills() function doesn't have to
  // requery them (although this would also involve reformatting the data here to match what DB would return)
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

function fetchQueue(characterId) {
  return skillQueue.getQueue(characterId)
  .then(function(esiQueue) {
    if (esiQueue.length == 0) {
      return [];
    }
    let outQueue = [];

    let now = new Date();
    let queueEnd = new Date(esiQueue[esiQueue.length - 1].finish_date);
    let totalDuration = queueEnd - now;

    for (let i = 0; i < esiQueue.length; i++) {
      let queueItem = esiQueue[i];
      let skillId = queueItem.skill_id;

      let skillStart = i == 0 ? now : new Date(queueItem.start_date);
      let skillEnd = new Date(queueItem.finish_date);

      let newItem = {
        id: skillId,
        proportionalStart: (skillStart - now) / totalDuration,
        proportionalEnd: (skillEnd - now) / totalDuration,
        durationLabel: timeUtil.shortDurationString(skillStart, skillEnd),
        targetLevel: queueItem.finished_level,
      };

      if (i == 0) {
        newItem.progress = skillQueue.getProgress(queueItem);
      }

      outQueue.push(newItem);
    }
    return outQueue;
  });
}