import { jsonEndpoint } from "../../../infra/express/protectedEndpoint";
import { dao } from "../../../db/dao";
import { Tnex } from "../../../db/tnex";

import { isAnyEsiError } from "../../../data-source/esi/error";
import { updateSkills } from "../../../domain/skills/skills";
import {
  getTrainingProgress,
  isQueueEntryCompleted,
} from "../../../domain/skills/skillQueue";
import { SkillsheetEntry } from "../../../db/dao/SkillsheetDao";
import { NamedSkillQueueRow } from "../../../db/dao/SkillQueueDao";
import {
  AccessTokenError,
  AccessTokenErrorType,
} from "../../../error/AccessTokenError";
import * as time from "../../../util/time";
import { defaultSkillName } from "../../../domain/skills/defaultSkillName";

export interface Payload {
  skills: {
    id: number;
    name: string;
    group: number | null;
    level: number;
    sp: number;
  }[];
  // Only present if account can read this character's skill queue
  queue?: {
    entries: QueueEntryJson[];
    completed: CompletedQueueEntryJson[];
    durationLabel: string | null;
  };
  // Only present if there was a problem when requesting the data
  warning?: string;
}

export interface QueueEntryJson {
  id: number;
  targetLevel: number;
  proportionalStart: number;
  proportionalEnd: number;
  durationLabel: string;
  eta: string;
  endTime: number;
  progress: number;
}

export interface CompletedQueueEntryJson {
  id: number;
  completed: number;
}

export default jsonEndpoint(function (
  req,
  res,
  db,
  account,
  privs
): Promise<Payload> {
  const characterId: number = parseInt(req.params.id);
  let isOwner = false;

  return Promise.resolve()
    .then(() => {
      return dao.character.getOwner(db, characterId);
    })
    .then((row) => {
      isOwner = account.id == (row && row.account_id);
      privs.requireRead("characterSkills", isOwner);
      return fetchData(db, characterId);
    })
    .then(({ rawSkills, rawQueue, warningMessage }) => {
      const payload: Payload = {
        skills: transformSkills(rawSkills),
        queue: undefined,
        warning: warningMessage,
      };

      if (privs.canRead("characterSkillQueue", isOwner)) {
        const { queued, completed } = transformQueue(rawQueue);
        payload.queue = {
          entries: queued,
          completed: completed,
          durationLabel: getRemainingDurationLabel(rawQueue),
        };
      }

      return payload;
    });
});

function fetchData(db: Tnex, characterId: number) {
  let warningMessage: string | undefined;

  return updateSkills(db, characterId)
    .catch((e) => {
      warningMessage = consumeOrThrowError(e);
    })
    .then(() => {
      return Promise.all([
        dao.skillQueue.getCachedSkillQueue(db, characterId),
        dao.skillsheet.get(db, characterId),
      ]);
    })
    .then(([queue, skills]) => {
      return {
        rawSkills: skills,
        rawQueue: queue,
        warningMessage: warningMessage,
      };
    });
}

function consumeOrThrowError(e: any) {
  if (isAnyEsiError(e)) {
    return "ESI request failed. Skills may be out of date.";
  } else if (e instanceof AccessTokenError) {
    switch (e.type) {
      case AccessTokenErrorType.TOKEN_MISSING:
        return "Missing access token for this character.";
      case AccessTokenErrorType.TOKEN_REFRESH_REJECTED:
        return (
          "Access token for this character appears to have expired." +
          " Please log in with this character again."
        );
      case AccessTokenErrorType.HTTP_FAILURE:
        return "Error getting refreshed access token from CCP.";
    }
  } else {
    // Unknown failure
    throw e;
  }
}

function transformSkills(skills: SkillsheetEntry[]) {
  return skills.map((skill) => {
    return {
      id: skill.skillsheet_skill,
      name: skill.styp_name || defaultSkillName(skill.skillsheet_skill),
      group: skill.styp_group,
      level: skill.skillsheet_level,
      sp: skill.skillsheet_skillpoints,
    };
  });
}

function transformQueue(queue: NamedSkillQueueRow[]) {
  const now = Date.now();
  const totalDuration = getRemainingDuration(queue, now);

  const completedEntries = [] as CompletedQueueEntryJson[];
  const queuedEntries = [] as QueueEntryJson[];

  for (let i = 0; i < queue.length; i++) {
    const queueItem = queue[i];

    if (isQueueEntryCompleted(queueItem)) {
      completedEntries.push({
        id: queueItem.skill,
        completed: queueItem.endTime!,
      });
    } else if (
      queueItem.startTime != null &&
      queueItem.endTime != null &&
      totalDuration != null
    ) {
      // Active queue item
      const skillStart = Math.max(now, queueItem.startTime);
      queuedEntries.push({
        id: queueItem.skill,
        targetLevel: queueItem.targetLevel,
        proportionalStart: (skillStart - now) / totalDuration,
        proportionalEnd: (queueItem.endTime - now) / totalDuration,
        durationLabel: time.shortDurationString(skillStart, queueItem.endTime),
        eta: "ETA: " + time.shortDurationString(now, queueItem.endTime),
        endTime: queueItem.endTime,
        progress:
          queuedEntries.length == 0 ? getTrainingProgress(queueItem) : 0,
      });
    } else {
      // Paused queue item
      queuedEntries.push({
        id: queueItem.skill,
        targetLevel: queueItem.targetLevel,
        proportionalStart: 0,
        proportionalEnd: 0,
        durationLabel: "-",
        eta: "",
        endTime: 0,
        progress: 0,
      });
    }
  }

  return {
    queued: queuedEntries,
    completed: completedEntries,
  };
}

function getRemainingDuration(queue: NamedSkillQueueRow[], now: number) {
  let totalDuration = null;
  const lastItem = queue.length > 0 ? queue[queue.length - 1] : null;
  if (lastItem != null && lastItem.endTime != null) {
    totalDuration = lastItem.endTime - now;
  }
  return totalDuration;
}

function getRemainingDurationLabel(queue: NamedSkillQueueRow[]) {
  const lastItem = queue[queue.length - 1];
  if (lastItem != null && lastItem.endTime != null) {
    return time.shortDurationString(Date.now(), lastItem.endTime);
  } else {
    return null;
  }
}
