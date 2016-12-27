const moment = require('moment');

const jsonEndpoint = require('../../../route-helper/jsonEndpoint');
const skillQueue = require('../../../data-source/skillQueue');
const time = require('../../../util/time');


const STATIC = require('../../../static-data').get();
const SKILL_LEVEL_LABELS = ['0', 'I', 'II', 'III', 'IV', 'V'];

module.exports = jsonEndpoint(function(req, res) {
  let characterId = req.params.id;

  return skillQueue.getQueue(characterId)
  .then(queueData => {
    return {
      skillInTraining: getSkillInTraining(queueData),
      queue: getQueue(queueData),
    };
  });
});

function getSkillInTraining(queueData) {
  let skillInTraining = null;
  if (queueData.length > 0) {
    let skill0 = queueData[0];
    let skillName = STATIC.SKILLS[skill0.skill_id].name;
    let skillLevelLabel = SKILL_LEVEL_LABELS[skill0.finished_level];

    skillInTraining = {
      name: skillName + ' ' + skillLevelLabel,
      progress: skillQueue.getProgress(skill0),
      timeRemaining:
          time.shortDurationString(Date.now(), skill0.finish_date, 2),
    }
  }
  return skillInTraining;
}

function getQueue(queueData) {
  let queue = null;
  if (queueData.length > 0) {
    let finalSkill = queueData[queueData.length - 1];
    queue = {
      count: queueData.length,
      timeRemaining:
          time.shortDurationString(Date.now(), finalSkill.finish_date, 2),
    }
  }
  return queue;
}
