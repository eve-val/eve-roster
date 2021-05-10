import { Tnex } from "../../db/tnex";
import { dao } from "../../db/dao";

import { getAccessToken } from "../../data-source/accessToken/accessToken";
import { updateSkillQueue, isQueueEntryCompleted } from "./skillQueue";
import { NamedSkillQueueRow } from "../../db/dao/SkillQueueDao";
import { SimpleNumMap } from "../../util/simpleTypes";
import { skillLevelToSp } from "../../eve/skillLevelToSp";
import * as sde from "../../eve/sde";
import { ESI_CHARACTERS_$characterId_SKILLS } from "../../data-source/esi/endpoints";
import { fetchEsi } from "../../data-source/esi/fetch/fetchEsi";

/** Throws AccessTokenError and ESI failure errors. */
export function updateSkills(db: Tnex, characterId: number) {
  return getAccessToken(db, characterId)
    .then((accessToken) => {
      return Promise.all([
        getSkillQueue(db, characterId, accessToken),
        getEsiSkills(characterId, accessToken),
      ]);
    })
    .then(([queue, esiSkills]) => {
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
          completedSkills[esiSkill.skill_id!]
        );
      });

      return dao.skillsheet.set(db, characterId, rows);
    });
}

function getSkillQueue(db: Tnex, characterId: number, accessToken: string) {
  return updateSkillQueue(db, characterId, accessToken).then(() => {
    return dao.skillQueue.getCachedSkillQueue(db, characterId);
  });
}

async function getEsiSkills(characterId: number, accessToken: string) {
  const data = await fetchEsi(ESI_CHARACTERS_$characterId_SKILLS, {
    characterId,
    _token: accessToken,
  });

  return data.skills;
}

function esiSkillToRow(
  characterId: number,
  esiSkill: EsiSkill,
  completedEntry: NamedSkillQueueRow | undefined
) {
  let skillLevel = esiSkill.trained_skill_level || 0;
  let skillSp = esiSkill.skillpoints_in_skill || 0;

  if (completedEntry != undefined) {
    skillLevel = completedEntry.targetLevel;
    skillSp = skillLevelToSp(getSkillRank(completedEntry.skill), skillLevel);
  }

  return {
    skillsheet_character: characterId,
    skillsheet_skill: esiSkill.skill_id!,
    skillsheet_level: skillLevel,
    skillsheet_skillpoints: skillSp,
  };
}

function getSkillRank(skillId: number) {
  return sde.getSkillDefinition(skillId).rank;
}

type EsiSkill =
  typeof ESI_CHARACTERS_$characterId_SKILLS["response"]["skills"][0];
