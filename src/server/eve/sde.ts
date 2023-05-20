import { Tnex } from "../db/tnex/index.js";
import {
  loadSdeSkillDefinitions,
  SdeSkill,
} from "./sde/loadSdeSkillDefinitions.js";
import { defaultSkillName } from "../domain/skills/defaultSkillName.js";
import { Logger } from "../infra/logging/Logger.js";

let skillDefinitions = new Map<number, SdeSkill>();

export { SdeSkill } from "./sde/loadSdeSkillDefinitions.js";

export async function loadStaticData(
  db: Tnex,
  strictMode: boolean,
  logger: Logger | null = null
) {
  const _skillDefinitions = await loadSdeSkillDefinitions(
    db,
    strictMode,
    logger
  );

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
    };
  }
  return skillDef;
}

export function getSkillName(skillId: number) {
  const skillDef = skillDefinitions.get(skillId);
  if (skillDef != undefined) {
    return skillDef.name;
  } else {
    return defaultSkillName(skillId);
  }
}
