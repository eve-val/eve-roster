const eve = require('../eve');

const moment = require('moment');


module.exports = {
  getQueue: function(characterId) {
    return eve.getAccessToken(characterId)
      .then(accessToken => {
        return eve.esi.character.getSkillQueue(characterId, accessToken);
      })
      .then(pruneCompletedSkills);
  },

  getProgress: function(queueEntry) {
    // There must be a better way to do this...

    let pretrainedProgress =
        (queueEntry.training_start_sp - queueEntry.level_start_sp) /
        (queueEntry.level_end_sp - queueEntry.level_start_sp);

    let trainingStart = new Date(queueEntry.start_date);
    let trainedProgress = (new Date() - trainingStart) /
        (new Date(queueEntry.finish_date) - trainingStart);

    return pretrainedProgress + trainedProgress * (1 - pretrainedProgress);
  },
}

function pruneCompletedSkills(queueData) {
  // Why do we even need to DO this... #ccpls
  let now = new Date();
  let startIndex = 0;
  for (let i = 0; i < queueData.length; i++) {
    startIndex = i;
    let endDate = new Date(queueData[i].finish_date);
    if (endDate > now) {
      break;
    }
  }
  return queueData.slice(startIndex);
}
