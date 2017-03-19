const eve = require('../eve');

module.exports = {
  getQueue: function(characterId) {
    return eve.getAccessToken(characterId)
      .then(accessToken => {
        return eve.esi.characters(characterId, accessToken).skillqueue();
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

    // Bound the result between 0 and 1, otherwise a skill that finished
    // since the last time a character logged in can show as > 100%
    let fraction = pretrainedProgress + trainedProgress * (1 - pretrainedProgress);
    return Math.min(Math.max(fraction, 0), 1);
  },
};

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
