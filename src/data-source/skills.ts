import { esi } from 'eve-swagger';

import { Tnex } from '../tnex';
import { dao } from '../dao';

import { getAccessTokenForCharacter } from './accessToken';
import swagger from '../swagger';
import { updateSkillQueue, isQueueEntryCompleted } from './skillQueue';
import { NamedSkillQueueRow } from '../dao/SkillQueueDao';
import { SkillsheetEntry } from '../dao/SkillsheetDao';
import { SimpleNumMap } from '../util/simpleTypes';
import { skillLevelToSp } from '../eve/skillLevelToSp';
import * as sde from '../eve/sde';
import { character } from '../dao/tables';

const logger = require('../util/logger')(__filename);


/** Throws MissingTokenError and ESI failure errors. */
export function updateSkills(db: Tnex, characterId: number) {
  let skillQueue: NamedSkillQueueRow[];

  return getAccessTokenForCharacter(db, characterId)
  .then(accessToken => {
    return Promise.all([
      getSkillQueue(db, characterId, accessToken),
      getEsiSkills(characterId, accessToken),
    ]);
  })
  .then(([queue, esiSkills]) => {
    skillQueue = queue;

    // Put all complete queue items into a map
    // More recent completions of the same skill will overwrite earlier entries
    let completedSkills = {} as SimpleNumMap<NamedSkillQueueRow>;
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
          characterId, esiSkill, completedSkills[esiSkill.skill_id!])
    });

    return dao.skillsheet.set(db, characterId, rows);
  })
}

function getSkillQueue(db: Tnex, characterId: number, accessToken: string) {
  return updateSkillQueue(db, characterId, accessToken)
  .then(() => {
    return dao.skillQueue.getCachedSkillQueue(db, characterId);
  })  
}

function getEsiSkills(characterId: number, accessToken: string) {
  return swagger.characters(characterId, accessToken).skills()
  .then(data => data.skills || []);
}

function esiSkillToRow(
    characterId: number,
    esiSkill: esi.character.Skill,
    completedEntry: NamedSkillQueueRow|undefined) {
  
  let skillLevel = esiSkill.current_skill_level || 0;
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
