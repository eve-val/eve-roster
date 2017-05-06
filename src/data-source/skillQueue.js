const Promise = require('bluebird');
const moment = require('moment');

const errorUtil = require('../util/error');
const eve = require('../eve');
const logger = require('../util/logger')(__filename);

module.exports = {
  loadQueue(trx, characterId, freshness='fresh') {
    if (freshness != 'cached' && freshness != 'fresh') {
      throw new Error(`Illegal freshness argument: "${freshness}".`);
    }

    let status;
    
    return Promise.resolve()
    .then(() => {
      if (freshness == 'fresh') {
        return getAndStoreEsiQueue(trx, characterId);
      } else {
        return 'cached';
      }
    })
    .then(_status => {
      status = _status;
      return this.getCachedQueue(trx, characterId);
    })
    .then(skillQueue => {
      return {
        status: status,
        queue: skillQueue,
      };
    });
  },

  getCachedQueue(trx, characterId) {
    return Promise.resolve()
    .then(() => {
      return trx.character.getCachedSkillQueue(characterId);
    })
    .then(skillQueue => {
      return pruneCompletedSkills(skillQueue);
    });
  },

  getTrainingProgress(queueEntry) {
    let pretrainedProgress = getProgressFraction(
      queueEntry.levelStartSp,
      queueEntry.levelEndSp,
      queueEntry.trainingStartSp);

    let trainedProgress = getProgressFraction(
      queueEntry.startTime,
      queueEntry.endTime,
      Date.now());

    // Bound the result between 0 and 1, otherwise a skill that finished
    // since the last time a character logged in can show as > 100%
    trainedProgress = Math.min(1, Math.max(0, trainedProgress));

    return pretrainedProgress
        + trainedProgress * (1 - pretrainedProgress);
  },

  getQueueStatus(queue) {
    if (queue.length == 0) {
      return 'empty';
    } else if (queue[0].startTime == null) {
      return 'paused';
    } else {
      return 'active';
    }
  }
};

function getAndStoreEsiQueue(trx, characterId) {
  let status = 'fresh';

  return Promise.resolve()
  .then(() => {
    return eve.getAccessToken(characterId)
  })
  .then(accessToken => {
    return eve.esi.characters(characterId, accessToken).skillqueue();
  })
  .then(esiQueue => {
    return trx.character.setCachedSkillQueue(
        characterId,
        convertEsiQueueToNativeQueue(esiQueue));
  })
  .catch(e => {
    if (errorUtil.isAnyEsiError(e)) {
      if (e.name == 'esi:ForbiddenError') {
        status = 'bad_credentials';
      } else {
        status = 'fetch_failure';
      }
      logger.error(
          `ESI error "${e.name}" while fetching skill queue for character`
              + ` ${characterId}.`);
      logger.error(e);
    } else {
      throw e;
    }
  })
  .then(() => {
    return status;
  });
}

function convertEsiQueueToNativeQueue(esiQueue) {
  esiQueue.sort((a, b) => {
    if (a.queue_position < b.queue_position) {
      return -1;
    } else if (a.queue_position > b.queue_position) {
      return 1;
    } else {
      return 0;
    }
  });

  return esiQueue.map(qi => {
    const nativeItem = {
      skill: qi.skill_id,
      targetLevel: qi.finished_level,
      startTime: null,
      endTime: null,
      levelStartSp: qi.level_start_sp,
      levelEndSp: qi.level_end_sp,
      trainingStartSp: qi.training_start_sp,
    };

    if (qi.start_date != undefined && qi.finish_date != undefined) {
      nativeItem.startTime = moment(qi.start_date).valueOf();
      nativeItem.endTime = moment(qi.finish_date).valueOf();
    }

    return nativeItem;
  });
}

function pruneCompletedSkills(queueData) {
  let now = moment().valueOf();
  let i = 0;
  while (i < queueData.length
      // Paused skill queues have items with null start times -- don't do any
      // pruning for paused queues.
      && queueData[i].startTime != null
      && queueData[i].endTime < now) {
    i++;
  }
  return queueData.slice(i);
}

function getProgressFraction(start, end, current) {
  if (start == null || end == null || end - start == 0) {
    return 0;
  } else {
    return (current - start) / (end - start);
  }
}
