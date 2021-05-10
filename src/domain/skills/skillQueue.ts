import Bluebird = require("bluebird");
import moment = require("moment");

import { Tnex } from "../../db/tnex";
import { dao } from "../../db/dao";
import { SkillQueueRow } from "../../db/dao/SkillQueueDao";
import { getAccessToken } from "../../data-source/accessToken/accessToken";
import { ESI_CHARACTERS_$characterId_SKILLQUEUE } from "../../data-source/esi/endpoints";
import { fetchEsi } from "../../data-source/esi/fetch/fetchEsi";

/**
 * Fetches fresh skill queue data from ESI and stores it in the DB. Returns a
 * copy of the stored rows.
 * @param accessToken If you already have an access token for this character,
 *   pass it here to skip querying for it again.
 */
export function updateSkillQueue(
  db: Tnex,
  characterId: number,
  accessToken?: string
) {
  let newQueue: SkillQueueRow[];

  return Bluebird.resolve()
    .then(() => {
      return accessToken || getAccessToken(db, characterId);
    })
    .then((accessToken) => {
      return fetchEsi(ESI_CHARACTERS_$characterId_SKILLQUEUE, {
        characterId,
        _token: accessToken,
      });
    })
    .then((esiQueue) => {
      newQueue = convertEsiQueueToNativeQueue(esiQueue);

      const set = new Set<string>();
      for (const queueItem of newQueue) {
        const key =
          characterId + "," + queueItem.skill + "," + queueItem.targetLevel;
        if (set.has(key)) {
          throw new Error(`Duplicate key: ${key}.`);
        }
        set.add(key);
      }

      return dao.skillQueue.setCachedSkillQueue(db, characterId, newQueue);
    });
}

export function isQueueEntryCompleted(queueEntry: SkillQueueRow): boolean {
  return queueEntry.endTime != null && queueEntry.endTime < Date.now();
}

export function getTrainingProgress(queueEntry: SkillQueueRow) {
  const pretrainedProgress = getProgressFraction(
    queueEntry.levelStartSp,
    queueEntry.levelEndSp,
    queueEntry.trainingStartSp
  );

  let trainedProgress = getProgressFraction(
    queueEntry.startTime,
    queueEntry.endTime,
    Date.now()
  );

  // Bound the result between 0 and 1, otherwise a skill that finished
  // since the last time a character logged in can show as > 100%
  trainedProgress = Math.min(1, Math.max(0, trainedProgress));

  return pretrainedProgress + trainedProgress * (1 - pretrainedProgress);
}

function getProgressFraction(
  start: number | null,
  end: number | null,
  current: number
) {
  if (start == null || end == null || end - start == 0) {
    return 0;
  } else {
    return (current - start) / (end - start);
  }
}

function convertEsiQueueToNativeQueue(
  esiQueue: EsiSkillQueueItem[]
): SkillQueueRow[] {
  esiQueue.sort(compareEsiQueueItem);

  return esiQueue.map((qi) => {
    const nativeItem: SkillQueueRow = {
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

function compareEsiQueueItem(a: EsiSkillQueueItem, b: EsiSkillQueueItem) {
  if (a.queue_position < b.queue_position) {
    return -1;
  } else if (a.queue_position > b.queue_position) {
    return 1;
  } else {
    return 0;
  }
}

type EsiSkillQueueItem =
  typeof ESI_CHARACTERS_$characterId_SKILLQUEUE["response"][0];
