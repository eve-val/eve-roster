const moment = require('moment');

const dao = require('../../../dao');
const getStub = require('../../../route-helper/getStub');
const jsonEndpoint = require('../../../route-helper/jsonEndpoint');
const skillQueue = require('../../../data-source/skillQueue');
const time = require('../../../util/time');

const CONFIG = require('../../../config-loader').load();
const STATIC = require('../../../static-data').get();
const SKILL_LEVEL_LABELS = ['0', 'I', 'II', 'III', 'IV', 'V'];

module.exports = jsonEndpoint(function(req, res, accountId, privs) {
  if (CONFIG.useStubOutput) {
    return Promise.resolve(getStub('dashboard.queuesummary.json'));
  }

  let characterId = req.params.id;

  return dao.getOwner(characterId)
  .then(row => {
    let owningAccount = row != null ? row.id : null;
    privs.requireRead('characterSkillQueue', accountId == owningAccount);
  })
  .then(() => {
    return skillQueue.getQueue(characterId);
  })
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
