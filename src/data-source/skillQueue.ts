import Promise = require('bluebird');
import moment = require('moment');

import { Tnex } from '../tnex';
import { dao } from '../dao';
import { SkillQueueEntry } from '../dao/SkillQueueDao';
import {default as swagger, esi} from '../esi';
import { getAccessTokenForCharacter } from '../data-source/accessToken';

const logger = require('../util/logger')(__filename);


/**
 * Fetches fresh skill queue data from ESI and stores it in the DB. Returns a
 * copy of the stored rows.
 * @param accessToken If you already have an access token for this character,
 *   pass it here to skip querying for it again.
 */
export function updateSkillQueue(
    db: Tnex, characterId: number, accessToken?: string) {
  let newQueue: SkillQueueEntry[];

  return Promise.resolve()
  .then(() => {
    return accessToken || getAccessTokenForCharacter(db, characterId)
  })
  .then(accessToken => {
    return swagger.characters(characterId, accessToken).skillqueue();
  })
  .then(esiQueue => {
    newQueue = convertEsiQueueToNativeQueue(esiQueue);

    let set = new Set<string>();
    for (let queueItem of newQueue) {
      let key = characterId + ',' + queueItem.skill + ',' + queueItem.targetLevel;
      if (set.has(key)) {
        throw new Error(`Duplicate key: ${key}.`);
      }
      set.add(key);
    }

    return dao.skillQueue.setCachedSkillQueue(db, characterId, newQueue);
  })
  .then(() => {
    return newQueue;
  });
}

export function isQueueEntryCompleted(queueEntry: SkillQueueEntry): boolean {
  return queueEntry.endTime != null && queueEntry.endTime < Date.now();
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

function convertEsiQueueToNativeQueue(
    esiQueue: esi.character.Skillqueue[]
    ): SkillQueueEntry[] {

  esiQueue.sort(compareEsiQueueItem);

  return esiQueue.map(qi => {
    const nativeItem: SkillQueueEntry = {
      skill: qi.skill_id,
      targetLevel: qi.finished_level,
      startTime: null,
      endTime: null,
      levelStartSp: qi.level_start_sp || 0,
      levelEndSp: qi.level_end_sp || 0,
      trainingStartSp: qi.training_start_sp || 0,
    };

    if (qi.start_date != undefined && qi.finish_date != undefined) {
      nativeItem.startTime = moment(qi.start_date).valueOf();
      nativeItem.endTime = moment(qi.finish_date).valueOf();
    }

    return nativeItem;
  });
}

function compareEsiQueueItem(a: esi.character.Skillqueue, b: esi.character.Skillqueue) {
  if (a.queue_position < b.queue_position) {
    return -1;
  } else if (a.queue_position > b.queue_position) {
    return 1;
  } else {
    return 0;
  }
}
