import Bluebird = require('bluebird');
import moment = require('moment');

import * as time from '../util/time';
import { Tnex } from '../tnex';
import { dao } from '../dao';
import { NamedSkillQueueRow } from '../dao/SkillQueueDao';
import { updateSkillQueue, getTrainingProgress, isQueueEntryCompleted } from '../data-source/skillQueue';
import { isAnyEsiError } from '../util/error';
import { AccessTokenError, AccessTokenErrorType } from '../error/AccessTokenError';

const logger = require('../util/logger')(__filename);


const SKILL_LEVEL_LABELS = ['0', 'I', 'II', 'III', 'IV', 'V'];

export type DataFreshness = 'fresh' | 'cached';
export type QueueStatus = 'empty' | 'paused' | 'active';
export type WarningType = 'bad_credentials' | 'fetch_failure';

export interface SkillQueueSummary {
  dataFreshness: DataFreshness,
  queueStatus: QueueStatus,
  skillInTraining: null | {
    name: string,
    progress: number,
    timeRemaining: string | null
  },
  queue: {
    count: number,
    timeRemaining: string | null;
  },
  warning?: WarningType,
}

/**
 * Loads a character's skill queue and then generates summary text for it
 * for use in the dashboard.
 */
export function loadSummarizedQueue(
    db: Tnex,
    characterId: number,
    freshness: DataFreshness,
    ) {
  return Bluebird.resolve()
  .then(() => {
    return loadQueue(db, characterId, freshness);
  })
  .then(({ queue, dataFreshness, warning }) => {
    queue = pruneCompletedSkills(queue);
    let queueStatus = getQueueStatus(queue);
    return {
      queueStatus: queueStatus,
      dataFreshness: dataFreshness,
      skillInTraining: getActiveSkillSummary(queue, queueStatus),
      queue: getQueueSummary(queue, queueStatus),
      warning: warning,
    }
  })
}

function loadQueue(db: Tnex, characterId: number, freshness: DataFreshness) {
  let dataFreshness = freshness;
  let warning = undefined as WarningType|undefined;

  return Bluebird.resolve()
  .then(() => {
    if (freshness != 'cached') {
      return updateSkillQueue(db, characterId)
    }
  })
  .catch(e => {
    warning = consumeOrThrowError(e, characterId);
    dataFreshness = 'cached';
  })
  .then(() => {
    return dao.skillQueue.getCachedSkillQueue(db, characterId);
  })
  .then(queue => {
    return {
      queue: queue,
      dataFreshness: freshness,
      warning: warning,
    }
  });
}

function consumeOrThrowError(e: any, characterId: number): WarningType {
  let warningType: WarningType;
  if (isAnyEsiError(e)) {
    if (e.name == 'esi:ForbiddenError') {
      warningType = 'bad_credentials';
    } else {
      warningType = 'fetch_failure';
    }
    logger.error(
        `ESI error "${e.name}" while fetching skill queue for character`
            + ` ${characterId}.`);
    logger.error(e);
  } else if (e instanceof AccessTokenError) {
    if (e.type == AccessTokenErrorType.HTTP_FAILURE) {
      warningType = 'fetch_failure';
    } else {
      warningType = 'bad_credentials';
    }
  } else {
    throw e;
  }

  return warningType;
}

function pruneCompletedSkills(queueData: NamedSkillQueueRow[]) {
  let now = moment().valueOf();
  let i = 0;
  for (; i < queueData.length; i++) {
    let item = queueData[i];

    if (!isQueueEntryCompleted(item)) {
      break;
    }
  }
  return queueData.slice(i);
}

function getQueueStatus(queue: NamedSkillQueueRow[]): QueueStatus {
  if (queue.length == 0) {
    return 'empty';
  } else if (queue[0].startTime == null) {
    return 'paused';
  } else {
    return 'active';
  }
}

function getActiveSkillSummary(
    queue: NamedSkillQueueRow[],
    queueStatus: QueueStatus,
    ) {
  let summary = null;
  if (queue.length > 0) {
    let firstItem = queue[0];
    let skillName = firstItem.name;
    let skillLevelLabel = SKILL_LEVEL_LABELS[firstItem.targetLevel];

    summary = {
      name: skillName + ' ' + skillLevelLabel,
      progress: getTrainingProgress(firstItem),
      timeRemaining: queueStatus == 'active' && firstItem.endTime != null
          ? time.shortDurationString(Date.now(), firstItem.endTime, 2)
          : null,
    };
  }
  return summary;
}

function getQueueSummary(
    queue: NamedSkillQueueRow[],
    queueStatus: QueueStatus,
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
