import Promise = require('bluebird');

import * as skillQueue from '../data-source/skillQueue';
import * as time from '../util/time';
import { Tnex } from '../tnex';
import { dao } from '../dao';
import { SkillQueueEntry } from '../dao/SkillQueueDao';


const STATIC = require('../static-data').get();
const SKILL_LEVEL_LABELS = ['0', 'I', 'II', 'III', 'IV', 'V'];

export interface SkillQueueSummary {
  dataStatus: string,
  queueStatus: 'empty' | 'paused' | 'active',
  skillInTraining: null | {
    name: string,
    progress: number,
    timeRemaining: string | null
  },
  queue: {
    count: number,
    timeRemaining: string | null;
  }
}

/**
 * Loads a character's skill queue and then generates summary text for it
 * for use in the dashboard.
 */
export function fetchSkillQueueSummary(
    db: Tnex,
    characterId: number,
    freshness='fresh',
    ): Promise<SkillQueueSummary> {
  return skillQueue.loadQueue(db, characterId, freshness)
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
}

function getActiveSkillSummary(
    queue: SkillQueueEntry[],
    queueStatus: skillQueue.QueueStatus,
    ) {
  let summary = null;
  if (queue.length > 0) {
    let firstItem = queue[0];
    let skillName = STATIC.SKILLS[firstItem.skill].name;
    let skillLevelLabel = SKILL_LEVEL_LABELS[firstItem.targetLevel];

    summary = {
      name: skillName + ' ' + skillLevelLabel,
      progress: skillQueue.getTrainingProgress(firstItem),
      timeRemaining: queueStatus == 'active' && firstItem.endTime != null
          ? time.shortDurationString(Date.now(), firstItem.endTime, 2)
          : null,
    };
  }
  return summary;
}

function getQueueSummary(
    queue: SkillQueueEntry[],
    queueStatus: skillQueue.QueueStatus,
    ) {
  let finalEntry = queue[queue.length - 1];
  return {
    count: queue.length,
    timeRemaining: queueStatus == 'active' && finalEntry.endTime != null
        ? time.shortDurationString(
            Date.now(),
            finalEntry.endTime,
            2)
        : null,
  };
}
