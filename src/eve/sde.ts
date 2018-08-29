import { Tnex } from '../tnex';
import { loadSdeSkillDefinitions, SdeSkill } from './sde/loadSdeSkillDefinitions';
import { defaultSkillName } from '../domain/skills/defaultSkillName';

let skillDefinitions = new Map<number, SdeSkill>();

export { SdeSkill } from './sde/loadSdeSkillDefinitions';

export async function loadStaticData(
    db: Tnex, strictMode: boolean) {
  const _skillDefinitions = await loadSdeSkillDefinitions(db, strictMode);

  skillDefinitions = _skillDefinitions;
}

export function getSkillDefinition(skillId: number) {
  let skillDef = skillDefinitions.get(skillId);
  if (!skillDef) {
    skillDef = {
      id: skillId,
      name: defaultSkillName(skillId),
      group: -1,
      rank: 1,
      requiredSkills: [],
    }
  }
  return skillDef;
}

export function getSkillName(skillId: number) {
  let skillDef = skillDefinitions.get(skillId);
  if (skillDef != undefined) {
    return skillDef.name;
  } else {
    return defaultSkillName(skillId);
  }
}
