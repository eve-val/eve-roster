import Promise = require('bluebird');
import moment = require('moment');

import { Tnex } from '../tnex';
import { dao } from '../dao';
import { SkillQueueEntry } from '../dao/SkillQueueDao';
import esi from '../esi';
import { getAccessTokenForCharacter } from '../data-source/accessToken';
import { SkillQueueEntry as EsiSkillQueueEntry } from '../esi';
import { isAnyEsiError } from '../util/error';

const logger = require('../util/logger')(__filename);


export type QueueStatus = 'empty' | 'paused' | 'active';

export function loadQueue(db: Tnex, characterId: number, freshness='fresh') {
  if (freshness != 'cached' && freshness != 'fresh') {
    throw new Error(`Illegal freshness argument: "${freshness}".`);
  }

  let status: string;
  
  return Promise.resolve()
  .then(() => {
    if (freshness == 'fresh') {
      return getAndStoreEsiQueue(db, characterId);
    } else {
      return 'cached';
    }
  })
  .then(_status => {
    status = _status;
    return getCachedQueue(db, characterId);
  })
  .then(skillQueue => {
    return {
      status: status,
      queue: skillQueue,
    };
  });
}

export function getCachedQueue(db: Tnex, characterId: number) {
  return Promise.resolve()
  .then(() => {
    return dao.skillQueue.getCachedSkillQueue(db, characterId);
  })
  .then(skillQueue => {
    return pruneCompletedSkills(skillQueue);
  });
}

export function getTrainingProgress(queueEntry: SkillQueueEntry) {
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
}

export function getQueueStatus(queue: SkillQueueEntry[]): QueueStatus {
  if (queue.length == 0) {
    return 'empty';
  } else if (queue[0].startTime == null) {
    return 'paused';
  } else {
    return 'active';
  }
}

function getAndStoreEsiQueue(db: Tnex, characterId: number) {
  let status = 'fresh';

  return Promise.resolve()
  .then(() => {
    return getAccessTokenForCharacter(db, characterId)
  })
  .then(accessToken => {
    return esi.characters(characterId, accessToken).skillqueue();
  })
  .then(esiQueue => {
    return dao.skillQueue.setCachedSkillQueue(
        db,
        characterId,
        convertEsiQueueToNativeQueue(esiQueue));
  })
  .catch(e => {
    if (isAnyEsiError(e)) {
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

function convertEsiQueueToNativeQueue(
    esiQueue: EsiSkillQueueEntry[]
    ): SkillQueueEntry[] {
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
    const nativeItem: SkillQueueEntry = {
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

function pruneCompletedSkills(queueData: SkillQueueEntry[]) {
  let now = moment().valueOf();
  let i = 0;
  for (; i < queueData.length; i++) {
    let item = queueData[i];

    if (item.endTime == null || item.endTime >= now) {
      break;
    }
  }

  return queueData.slice(i);
}

function getProgressFraction(
    start: number | null,
    end: number | null,
    current: number) {
  if (start == null || end == null || end - start == 0) {
    return 0;
  } else {
    return (current - start) / (end - start);
  }
}
