import { Tnex, val } from '../../tnex';
import { sdeType, sdeTypeAttribute, sdeAttribute } from '../../db/tables';

import { buildLoggerFromFilename } from '../../infra/logging/buildLogger';
import { TYPE_CATEGORY_SKILL } from '../constants/categories';
import { DGM_ATTR_REQUIRED_SKILL_1, DGM_ATTR_REQUIRED_SKILL_2, DGM_ATTR_REQUIRED_SKILL_3, DGM_ATTR_REQUIRED_SKILL_1_LEVEL, DGM_ATTR_REQUIRED_SKILL_2_LEVEL, DGM_ATTR_REQUIRED_SKILL_3_LEVEL, DGM_ATTR_SKILL_TIME_CONSTANT } from '../constants/dogma';

const logger = buildLoggerFromFilename(__filename);


export interface SdeSkill {
  readonly id: number;
  readonly name: string;
  readonly group: number,
  readonly rank: number;
  readonly requiredSkills: {
    readonly skill: number,
    readonly level: number,
  }[];
}

export async function loadSdeSkillDefinitions(
    db: Tnex, strictMode: boolean) {
  const skills  = new Map<number, PartialSkill>();

  await loadSkills(db, skills);
  await loadSkillAttributes(db, skills);
  verifyDefinitions(skills, strictMode);

  return skills as Map<number, SdeSkill>;
}

async function loadSkills(db: Tnex, skills: Map<number, PartialSkill>) {
  let rows = await db
      .select(sdeType)
      .columns(
          'styp_id',
          'styp_name',
          'styp_group',
          )
      .where('styp_category', '=', val(TYPE_CATEGORY_SKILL))
      .run();

  for (let row of rows) {
    skills.set(row.styp_id, {
      id: row.styp_id,
      name: row.styp_name,
      group: row.styp_group,
      rank: 0,
      requiredSkills: []
    });
  }
}

async function loadSkillAttributes(db: Tnex, skills: Map<number, PartialSkill>) {
  let attrRows = await db
      .select(sdeType)
      .join(sdeTypeAttribute, 'sta_type', '=', 'styp_id')
      .join(sdeAttribute, 'sattr_id', '=', 'sta_attribute')
      .columns(
          'styp_id',
          'sattr_id',
          'sta_valueInt',
          'sta_valueFloat',
          )
      .where('styp_category', '=', val(TYPE_CATEGORY_SKILL))
      .whereIn('sattr_id', [
        DGM_ATTR_REQUIRED_SKILL_1,
        DGM_ATTR_REQUIRED_SKILL_2,
        DGM_ATTR_REQUIRED_SKILL_3,
        DGM_ATTR_REQUIRED_SKILL_1_LEVEL,
        DGM_ATTR_REQUIRED_SKILL_2_LEVEL,
        DGM_ATTR_REQUIRED_SKILL_3_LEVEL,
        DGM_ATTR_SKILL_TIME_CONSTANT,
      ])
      .run();

  for (let row of attrRows) {
    let skill = skills.get(row.styp_id);
    if (skill == undefined) {
      throw new Error(`Missing definition for skill ${row.styp_id}.`);
    }

    // The SDE isn't consistent as to whether it uses valueInt or valueFloat
    // for certain skill attributes, so we pick whichever is not null. Oy.
    const value = row.sta_valueInt != null
        ? row.sta_valueInt : row.sta_valueFloat!;

    switch (row.sattr_id) {
      case DGM_ATTR_REQUIRED_SKILL_1:
        setRequiredSkill(skill, 0, value!);
        break;
      case DGM_ATTR_REQUIRED_SKILL_1_LEVEL:
        setRequiredSkillLevel(skill, 0, value!);
        break;
      case DGM_ATTR_REQUIRED_SKILL_2:
        setRequiredSkill(skill, 1, value!);
        break;
      case DGM_ATTR_REQUIRED_SKILL_2_LEVEL:
        setRequiredSkillLevel(skill, 1, value!);
        break;
      case DGM_ATTR_REQUIRED_SKILL_3:
        setRequiredSkill(skill, 2, value!);
        break;
      case DGM_ATTR_REQUIRED_SKILL_3_LEVEL:
        setRequiredSkillLevel(skill, 2, value!);
        break;
      case DGM_ATTR_SKILL_TIME_CONSTANT:
        skill.rank = value;
        break;
      default:
        throw new Error(`Unknown attribute ID "${row.sattr_id}".`);
    }
  }
}

function verifyDefinitions(
    skills: Map<number, PartialSkill>, strictMode: boolean) {
  for (let [id, skill] of skills) {
    if (skill.rank == null) {
      handleFailure(`Undefined rank for ${id}:${skill.name}.`, strictMode);
      skill.rank = 1;
    }
    for (let i = 0; i < skill.requiredSkills.length; i++) {
      let reqSkill = skill.requiredSkills[i];
      let pruneRequirement = false;
      if (reqSkill == null) {
        handleFailure(
            `Required skill ${i} for ${id}:${skill.name} is null.`,
            strictMode);
        pruneRequirement = true;
      }
      if (reqSkill.skill == null) {
        handleFailure(
            `Required skill ${i} for ${id}:${skill.name} has a null id.`,
            strictMode);
        pruneRequirement = true;
      }
      if (reqSkill.level == null) {
        handleFailure(
            `Required skill ${i} for ${id}:${skill.name} has a null level.`,
            strictMode);
        pruneRequirement = true;
      }
      if (pruneRequirement) {
        skill.requiredSkills.splice(i, 1);
        i--;
      }
    }
  }
}

function handleFailure(message: string, strictMode: boolean) {
  if (strictMode) {
    throw new Error(`SDE verification failure: ${message}`);
  } else {
    logger.error(message);
  }
}

function setRequiredSkill(
    skill: PartialSkill, position: number, requiredSkill: number) {
  getRequiredSkill(skill, position).skill = requiredSkill;
}

function setRequiredSkillLevel(
    skill: PartialSkill, position: number, level: number) {
  getRequiredSkill(skill, position).level = level;
}

function getRequiredSkill(skill: PartialSkill, position: number) {
  let reqSkill = skill.requiredSkills[position];
  if (reqSkill == undefined) {
    reqSkill = {
      pos: position,
      skill: null,
      level: null,
    };
    skill.requiredSkills[position] = reqSkill;
  }
  return reqSkill;
}

interface PartialSkill {
  id: number;
  name: string;
  group: number,
  rank: number | null;
  requiredSkills: {
    pos: number,
    skill: number | null,
    level: number | null,
  }[];
}
