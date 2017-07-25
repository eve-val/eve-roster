import { Tnex } from '../tnex';
import { dao } from '../dao';

import { getAccessTokenForCharacter } from './accessToken';
import { default as esi, SkillsheetEntry as EsiSkill } from '../esi';
import { updateSkillQueue, isQueueEntryCompleted } from './skillQueue';
import { SkillQueueEntry } from '../dao/SkillQueueDao';
import { SkillsheetEntry } from '../dao/SkillsheetDao';
import { SimpleNumMap } from '../util/simpleTypes';
import { skillLevelToSp } from '../eve/skillLevelToSp';

const STATIC = require('../static-data').get();
const logger = require('../util/logger')(__filename);


/** Throws MissingTokenError and ESI failure errors. */
export function updateSkills(db: Tnex, characterId: number) {
  let skillQueue: SkillQueueEntry[];
  let skills: SkillsheetEntry[];

  return getAccessTokenForCharacter(db, characterId)
  .then(accessToken => {
    return Promise.all([
      updateSkillQueue(db, characterId, accessToken),
      getEsiSkills(characterId, accessToken),
    ]);
  })
  .then(([queue, esiSkills]) => {
    skillQueue = queue;

    // Put all complete queue items into a map
    // More recent completions of the same skill will overwrite earlier entries
    let completedSkills = {} as SimpleNumMap<SkillQueueEntry>;
    for (let queueItem of queue) {
      if (isQueueEntryCompleted(queueItem)) {
        completedSkills[queueItem.skill] = queueItem;
      } else {
        break;
      }
    }

    // Convert the skills array to the final, merged set of skills
    let rows = esiSkills.map(esiSkill => {
      return esiSkillToRow(
          characterId, esiSkill, completedSkills[esiSkill.skill_id])
    });
    skills = rows;

    return dao.skillsheet.set(db, characterId, rows);
  })
  .then(() => {
    return {
      queue: skillQueue,
      skills: skills,
    };
  })
}

function getEsiSkills(characterId: number, accessToken: string) {
  return esi.characters(characterId, accessToken).skills()
  .then(data => data.skills);
}

function esiSkillToRow(
    characterId: number,
    esiSkill: EsiSkill,
    completedEntry: SkillQueueEntry|undefined) {
  
  let skillLevel = esiSkill.current_skill_level;
  let skillSp = esiSkill.skillpoints_in_skill;

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
  let skill = STATIC.SKILLS[skillId];
  if (skill == undefined) {
    logger.error(`Unknown skill ${skillId}.`);
    return 1;
  } else {
    return skill.rank;
  }
}
