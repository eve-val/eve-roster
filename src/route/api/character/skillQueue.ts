import Promise = require('bluebird');
import moment = require('moment');

import { jsonEndpoint } from '../../../route-helper/protectedEndpoint';
import { dao } from '../../../dao';
import { Tnex, Nullable } from '../../../tnex';
import { SkillQueueEntry } from '../../../dao/SkillQueueDao';
import { MissingTokenError } from '../../../error/MissingTokenError';

import * as skillQueue from '../../../data-source/skillQueue';
import * as time from '../../../util/time';

export interface Payload {
  dataStatus: string,
  queue: QueueItemJson[],
}

export interface QueueItemJson {
  id: number,
  targetLevel: number,
  proportionalStart: number,
  proportionalEnd: number,
  durationLabel: string,
  progress: number,
}

export default jsonEndpoint((req, res, db, account, privs) => {
  let characterId = req.params.id;

  return dao.character.getOwner(db, characterId)
  .then(row => {
    let owningAccount = row != null ? row.account_id : null;
    privs.requireRead('characterSkillQueue', account.id == owningAccount);
  })
  .then(() => {
    return skillQueue.loadQueue(db, characterId, 'fresh');
  })
  .then(function(queueResult) {
    let queue = queueResult.queue;
    let now = Date.now();
    let totalDuration = getRemainingDuration(queue, now);

    let transformedQueue = queue.map((queueItem, i) => {

      let skillStart = i == 0 ? now : queueItem.startTime;
      let skillEnd = queueItem.endTime;

      let itemJson:QueueItemJson = {
        id: queueItem.skill,
        targetLevel: queueItem.targetLevel,
        proportionalStart: 0,
        proportionalEnd: 0,
        durationLabel: '-',
        progress: 0,
      };

      if (skillStart != null && skillEnd != null && totalDuration != null) {
        itemJson.proportionalStart = (skillStart - now) / totalDuration;
        itemJson.proportionalEnd = (skillEnd - now) / totalDuration;
        itemJson.durationLabel = time.shortDurationString(skillStart, skillEnd);
      }

      if (i == 0) {
        itemJson.progress = skillQueue.getTrainingProgress(queueItem);
      }

      return itemJson;
    });

    return {
      dataStatus: queueResult.status,
      queue: transformedQueue,
    };
  })
  .catch(e => {
    if (e instanceof MissingTokenError) {
      return { warning: 'Missing access token, unable to fetch skill queue.' };
    } else {
      throw e;
    }
  })
});

function getRemainingDuration(queue: SkillQueueEntry[], now: number) {
  let totalDuration = null;
  let lastItem = queue.length > 0 ? queue[queue.length - 1] : null;
  if (lastItem != null && lastItem.endTime != null) {
    totalDuration = lastItem.endTime - now;
  }
  return totalDuration;
}
