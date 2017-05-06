const Promise = require('bluebird');

const skillQueue = require('../data-source/skillQueue');
const time = require('../util/time');

const STATIC = require('../static-data').get();
const SKILL_LEVEL_LABELS = ['0', 'I', 'II', 'III', 'IV', 'V'];

/**
 * Loads a character's skill queue and then generates summary text for it
 * for use in the dashboard.
 */
module.exports = {
  fetchSkillQueueSummary(trx, characterId, freshness='fresh') {
    return skillQueue.loadQueue(trx, characterId, freshness)
    .then(queueResult => {
      let dataStatus = queueResult.status == 'cached' && freshness == 'cached'
          ? 'cached-preview'
          : queueResult.status;
      let queueStatus = skillQueue.getQueueStatus(queueResult.queue);
      return {
        dataStatus: dataStatus,
        queueStatus: queueStatus,
        skillInTraining: getActiveSkillSummary(queueResult.queue, queueStatus),
        queue: getQueueSummary(queueResult.queue, queueStatus),
      };
    });
  },
};

function getQueueStatus(queue) {
  if (queue.length == 0) {
    return 'empty';
  } else if (skillQueue.isQueuePaused(queue)) {
    return 'paused';
  } else {
    return 'active';
  }
}

function getActiveSkillSummary(queue, queueStatus) {
  let summary = null;
  if (queue.length > 0) {
    let firstItem = queue[0];
    let skillName = STATIC.SKILLS[firstItem.skill].name;
    let skillLevelLabel = SKILL_LEVEL_LABELS[firstItem.targetLevel];

    summary = {
      name: skillName + ' ' + skillLevelLabel,
      progress: skillQueue.getTrainingProgress(firstItem),
      timeRemaining: queueStatus == 'active'
          ? time.shortDurationString(Date.now(), firstItem.endTime, 2)
          : null,
    }
  }
  return summary;
}

function getQueueSummary(queue, queueStatus) {
  return {
    count: queue.length,
    timeRemaining: queueStatus == 'active'
        ? time.shortDurationString(
            Date.now(),
            queue[queue.length - 1].endTime,
            2)
        : null,
  };
}
