const Promise = require('bluebird');

const dao = require('../../../dao');
const MissingTokenError = require('../../../error/MissingTokenError');
const protectedEndpoint = require('../../../route-helper/protectedEndpoint');
const skillQueue = require('../../../data-source/skillQueue');
const time = require('../../../util/time');

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  let characterId = req.params.id;

  return dao.getOwner(characterId)
  .then(row => {
    let owningAccount = row != null ? row.id : null;
    privs.requireRead('characterSkillQueue', account.id == owningAccount);
  })
  .then(() => {
    return skillQueue.loadQueue(dao, characterId, 'fresh');
  })
  .then(function(queueResult) {
    let queue = queueResult.queue;
    let now = Date.now();
    let totalDuration = null;
    if (queue.length > 0 && queue[0].startTime != null) {
      totalDuration = queue[queue.length - 1].endTime - now;
    }

    let transformedQueue = queue.map((queueItem, i) => {
      let skillStart = i == 0 ? now : queueItem.startTime;
      let skillEnd = queueItem.endTime;

      let transformedItem = {
        id: queueItem.skill,
        proportionalStart: (skillStart - now) / totalDuration,
        proportionalEnd: (skillEnd - now) / totalDuration,
        durationLabel: time.shortDurationString(skillStart, skillEnd),
        targetLevel: queueItem.targetLevel,
      };

      if (i == 0) {
        transformedItem.progress = skillQueue.getTrainingProgress(queueItem);
      }

      return transformedItem;
    });

    return {
      dataStatus: queueResult.status,
      queue: transformedQueue,
    };
  })
  .catch(function(err) {
    if (err instanceof MissingTokenError) {
      return { warning: 'Missing access token, unable to fetch skill queue.' };
    } else {
      throw err;
    }
  })
});
