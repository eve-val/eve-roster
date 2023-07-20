import { jsonEndpoint } from "../../../infra/express/protectedEndpoint.js";
import { dao } from "../../../db/dao.js";
import { Tnex } from "../../../db/tnex/index.js";

import { isAnyEsiError } from "../../../data-source/esi/error.js";
import { updateSkills } from "../../../domain/skills/skills.js";
import {
  getTrainingProgress,
  isQueueEntryCompleted,
} from "../../../domain/skills/skillQueue.js";
import { SkillsheetEntry } from "../../../db/dao/SkillsheetDao.js";
import { NamedSkillQueueRow } from "../../../db/dao/SkillQueueDao.js";
import {
  AccessTokenError,
  AccessTokenErrorType,
} from "../../../error/AccessTokenError.js";
import * as time from "../../../util/time.js";
import {
  CharacterSkillJson,
  Character_Skills_GET,
  CompletedQueueEntryJson,
  QueueEntryJson,
} from "../../../../shared/route/api/character/skills_GET.js";
import { arrayToMap } from "../../../../shared/util/collections.js";
import { getAllSdeSkills } from "../../../eve/sde.js";

export default jsonEndpoint(
  function (req, res, db, account, privs): Promise<Character_Skills_GET> {
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
        const payload: Character_Skills_GET = {
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
  },
);

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

function transformSkills(learnedSkills: SkillsheetEntry[]) {
  // Note that because we iterate over only known skills here, new skills won't
  // appear here until the SDE gets updated. Which is probably fine, because
  // those skills would have to be called something useless like
  // "Unknown Skill".

  const learnedSkillMap = arrayToMap(learnedSkills, "skillsheet_skill");

  const transformedSkills = [] as CharacterSkillJson[];
  for (const eveSkill of getAllSdeSkills()) {
    const learnedSkill = learnedSkillMap.get(eveSkill.id);
    transformedSkills.push({
      id: eveSkill.id,
      name: eveSkill.name,
      group: eveSkill.group,
      level: learnedSkill?.skillsheet_level || 0,
      sp: learnedSkill?.skillsheet_skillpoints || 0,
    });
  }

  return transformedSkills;
}

function transformQueue(queue: NamedSkillQueueRow[]) {
  const now = Date.now();
  const totalDuration = getRemainingDuration(queue, now);

  const completedEntries = [] as CompletedQueueEntryJson[];
  const queuedEntries = [] as QueueEntryJson[];

  for (const queueItem of queue) {
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
