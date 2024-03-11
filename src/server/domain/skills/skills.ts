import { Tnex } from "../../db/tnex/index.js";
import { dao } from "../../db/dao.js";

import { fetchAccessToken } from "../../data-source/accessToken/accessToken.js";
import { updateSkillQueue, isQueueEntryCompleted } from "./skillQueue.js";
import { NamedSkillQueueRow } from "../../db/dao/SkillQueueDao.js";
import { SimpleNumMap } from "../../../shared/util/simpleTypes.js";
import { skillLevelToSp } from "../../eve/skillLevelToSp.js";
import * as sde from "../../eve/sde.js";
import { ESI_CHARACTERS_$characterId_SKILLS } from "../../data-source/esi/endpoints.js";
import { fetchEsi } from "../../data-source/esi/fetch/fetchEsi.js";
import { EsiScope } from "../../data-source/esi/EsiScope.js";

/** Throws AccessTokenError and ESI failure errors. */
export function updateSkills(db: Tnex, characterId: number) {
  return Promise.all([
    getSkillQueue(db, characterId),
    getEsiSkills(db, characterId),
  ]).then(([queue, esiSkills]) => {
    // Put all complete queue items into a map
    // More recent completions of the same skill will overwrite earlier entries
    const completedSkills = {} as SimpleNumMap<NamedSkillQueueRow>;
    for (const queueItem of queue) {
      if (isQueueEntryCompleted(queueItem)) {
        completedSkills[queueItem.skill] = queueItem;
      } else {
        break;
      }
    }

    // Convert the skills array to the final, merged set of skills
    const rows = esiSkills.map((esiSkill) => {
      return esiSkillToRow(
        characterId,
        esiSkill,
        completedSkills[esiSkill.skill_id],
      );
    });

    return dao.skillsheet.set(db, characterId, rows);
  });
}

function getSkillQueue(db: Tnex, characterId: number) {
  return updateSkillQueue(db, characterId).then(() => {
    return dao.skillQueue.getCachedSkillQueue(db, characterId);
  });
}

async function getEsiSkills(db: Tnex, characterId: number) {
  const accessToken = await fetchAccessToken(db, characterId, [
    EsiScope.READ_SKILLS,
  ]);
  const data = await fetchEsi(ESI_CHARACTERS_$characterId_SKILLS, {
    characterId,
    _token: accessToken,
  });

  return data.skills;
}

function esiSkillToRow(
  characterId: number,
  esiSkill: EsiSkill,
  completedEntry: NamedSkillQueueRow | undefined,
) {
  let skillLevel = esiSkill.trained_skill_level || 0;
  let skillSp = esiSkill.skillpoints_in_skill || 0;

  if (completedEntry != undefined) {
    skillLevel = completedEntry.targetLevel;
    skillSp = skillLevelToSp(getSkillRank(completedEntry.skill), skillLevel);
  }

  return {
    skillsheet_character: characterId,
    skillsheet_skill: esiSkill.skill_id,
    skillsheet_level: skillLevel,
    skillsheet_skillpoints: skillSp,
  };
}

function getSkillRank(skillId: number) {
  return sde.getSkillDefinition(skillId).rank;
}

type EsiSkill =
  (typeof ESI_CHARACTERS_$characterId_SKILLS)["response"]["skills"][0];
