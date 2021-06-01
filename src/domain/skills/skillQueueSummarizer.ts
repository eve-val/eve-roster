import * as time from "../../util/time";
import { Tnex } from "../../db/tnex";
import { dao } from "../../db/dao";
import { NamedSkillQueueRow } from "../../db/dao/SkillQueueDao";
import {
  updateSkillQueue,
  getTrainingProgress,
  isQueueEntryCompleted,
} from "./skillQueue";
import { isAnyEsiError } from "../../data-source/esi/error";
import {
  AccessTokenError,
  AccessTokenErrorType,
} from "../../error/AccessTokenError";
import { buildLoggerFromFilename } from "../../infra/logging/buildLogger";

const logger = buildLoggerFromFilename(__filename);

const SKILL_LEVEL_LABELS = ["0", "I", "II", "III", "IV", "V"];

import {
  DataFreshness,
  QueueStatus,
  WarningType,
  SkillQueueSummary,
} from "./skillQueueSummary";

/**
 * Loads a character's skill queue and then generates summary text for it
 * for use in the dashboard.
 */
export function loadSummarizedQueue(
  db: Tnex,
  characterId: number,
  freshness: DataFreshness
): Promise<SkillQueueSummary> {
  return Promise.resolve()
    .then(() => {
      return loadQueue(db, characterId, freshness);
    })
    .then(({ queue, dataFreshness, warning }) => {
      queue = pruneCompletedSkills(queue);
      const queueStatus = getQueueStatus(queue);
      return {
        queueStatus: queueStatus,
        dataFreshness: dataFreshness,
        skillInTraining: getActiveSkillSummary(queue, queueStatus),
        queue: getQueueSummary(queue, queueStatus),
        warning: warning,
      };
    });
}

function loadQueue(db: Tnex, characterId: number, freshness: DataFreshness) {
  let dataFreshness = freshness;
  let warning = undefined as WarningType | undefined;

  return Promise.resolve()
    .then(() => {
      if (freshness != "cached") {
        return updateSkillQueue(db, characterId);
      }
      return undefined;
    })
    .catch((e) => {
      warning = consumeOrThrowError(e, characterId);
      dataFreshness = "cached";
    })
    .then(() => {
      return dao.skillQueue.getCachedSkillQueue(db, characterId);
    })
    .then((queue) => {
      return {
        queue: queue,
        dataFreshness: dataFreshness,
        warning: warning,
      };
    });
}

function consumeOrThrowError(e: any, characterId: number): WarningType {
  let warningType: WarningType;
  if (isAnyEsiError(e)) {
    if (e.name == "esi:ForbiddenError") {
      warningType = "bad_credentials";
    } else {
      warningType = "fetch_failure";
    }
    logger.error(
      `ESI error "${e.name}" while fetching skill queue for character` +
        ` ${characterId}.`,
      e
    );
  } else if (e instanceof AccessTokenError) {
    if (e.type == AccessTokenErrorType.HTTP_FAILURE) {
      warningType = "fetch_failure";
    } else {
      warningType = "bad_credentials";
    }
  } else {
    throw e;
  }

  return warningType;
}

function pruneCompletedSkills(queueData: NamedSkillQueueRow[]) {
  let i = 0;
  for (; i < queueData.length; i++) {
    const item = queueData[i];

    if (!isQueueEntryCompleted(item)) {
      break;
    }
  }
  return queueData.slice(i);
}

function getQueueStatus(queue: NamedSkillQueueRow[]): QueueStatus {
  if (queue.length == 0) {
    return "empty";
  } else if (queue[0].startTime == null) {
    return "paused";
  } else {
    return "active";
  }
}

function getActiveSkillSummary(
  queue: NamedSkillQueueRow[],
  queueStatus: QueueStatus
) {
  let summary = null;
  if (queue.length > 0) {
    const firstItem = queue[0];
    const skillName = firstItem.name;
    const skillLevelLabel = SKILL_LEVEL_LABELS[firstItem.targetLevel];

    summary = {
      name: skillName + " " + skillLevelLabel,
      progress: getTrainingProgress(firstItem),
      timeRemaining:
        queueStatus == "active" && firstItem.endTime != null
          ? time.shortDurationString(Date.now(), firstItem.endTime, 2)
          : null,
    };
  }
  return summary;
}

function getQueueSummary(
  queue: NamedSkillQueueRow[],
  queueStatus: QueueStatus
) {
  const finalEntry = queue[queue.length - 1];
  return {
    count: queue.length,
    timeRemaining:
      queueStatus == "active" && finalEntry.endTime != null
        ? time.shortDurationString(Date.now(), finalEntry.endTime, 2)
        : null,
  };
}
