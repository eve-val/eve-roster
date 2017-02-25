const moment = require('moment');
const Promise = require('bluebird');

const dao = require('../../../dao');
const MissingAccessToken = require('../../../error/MissingTokenError');
const protectedEndpoint = require('../../../route-helper/protectedEndpoint');
const skillQueue = require('../../../data-source/skillQueue');
const time = require('../../../util/time');

const STATIC = require('../../../static-data').get();
const SKILL_LEVEL_LABELS = ['0', 'I', 'II', 'III', 'IV', 'V'];

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  let characterId = req.params.id;

  return dao.getOwner(characterId)
  .then(row => {
    let owningAccount = row != null ? row.id : null;
    privs.requireRead('characterSkillQueue', account.id == owningAccount);
  })
  .then(() => {
    return skillQueue.getQueue(characterId);
  })
  .then(queueData => {
    return {
      skillInTraining: getSkillInTraining(queueData),
      queue: getQueue(queueData),
    };
  })
  .catch(err => {
    if (err instanceof MissingAccessToken) {
      return {
        warning: 'Missing access token, queue unavailable.',
      }
    } else {
      throw err;
    }
  })
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
