import { Tnex, val } from "../../db/tnex/index.js";
import { sdeType, sdeTypeAttribute, sdeAttribute } from "../../db/tables.js";

import { fileURLToPath } from "url";
import { buildLoggerFromFilename } from "../../infra/logging/buildLogger.js";
import { TYPE_CATEGORY_SKILL } from "../constants/categories.js";
import {
  DGM_ATTR_REQUIRED_SKILL_1,
  DGM_ATTR_REQUIRED_SKILL_2,
  DGM_ATTR_REQUIRED_SKILL_3,
  DGM_ATTR_REQUIRED_SKILL_1_LEVEL,
  DGM_ATTR_REQUIRED_SKILL_2_LEVEL,
  DGM_ATTR_REQUIRED_SKILL_3_LEVEL,
  DGM_ATTR_SKILL_TIME_CONSTANT,
} from "../constants/dogma.js";
import { Logger } from "../../infra/logging/Logger.js";

const defaultLogger = buildLoggerFromFilename(fileURLToPath(import.meta.url));

export interface SdeSkill {
  readonly id: number;
  readonly name: string;
  readonly group: number;
  readonly rank: number;
  readonly requiredSkills: {
    readonly skill: number;
    readonly level: number;
  }[];
}

export async function loadSdeSkillDefinitions(
  db: Tnex,
  strictMode: boolean,
  logger: Logger | null,
) {
  const skills = new Map<number, PartialSkill>();

  await loadSkills(db, skills);
  await loadSkillAttributes(db, skills);
  verifyDefinitions(logger ?? defaultLogger, skills, strictMode);

  return skills as Map<number, SdeSkill>;
}

async function loadSkills(db: Tnex, skills: Map<number, PartialSkill>) {
  const rows = await db
    .select(sdeType)
    .columns("styp_id", "styp_name", "styp_group")
    .where("styp_category", "=", val(TYPE_CATEGORY_SKILL))
    .run();

  for (const row of rows) {
    skills.set(row.styp_id, {
      id: row.styp_id,
      name: row.styp_name,
      group: row.styp_group,
      rank: 0,
      requiredSkills: [],
    });
  }
}

async function loadSkillAttributes(
  db: Tnex,
  skills: Map<number, PartialSkill>,
) {
  const attrRows = await db
    .select(sdeType)
    .join(sdeTypeAttribute, "sta_type", "=", "styp_id")
    .join(sdeAttribute, "sattr_id", "=", "sta_attribute")
    .columns("styp_id", "sattr_id", "sta_valueInt", "sta_valueFloat")
    .where("styp_category", "=", val(TYPE_CATEGORY_SKILL))
    .whereIn("sattr_id", [
      DGM_ATTR_REQUIRED_SKILL_1,
      DGM_ATTR_REQUIRED_SKILL_2,
      DGM_ATTR_REQUIRED_SKILL_3,
      DGM_ATTR_REQUIRED_SKILL_1_LEVEL,
      DGM_ATTR_REQUIRED_SKILL_2_LEVEL,
      DGM_ATTR_REQUIRED_SKILL_3_LEVEL,
      DGM_ATTR_SKILL_TIME_CONSTANT,
    ])
    .run();

  for (const row of attrRows) {
    const skill = skills.get(row.styp_id);
    if (skill == undefined) {
      throw new Error(`Missing definition for skill ${row.styp_id}.`);
    }

    // The SDE isn't consistent as to whether it uses valueInt or valueFloat
    // for certain skill attributes, so we pick whichever is not null. Oy.
    const value = row.sta_valueInt ?? row.sta_valueFloat!;

    switch (row.sattr_id) {
      case DGM_ATTR_REQUIRED_SKILL_1:
        setRequiredSkill(skill, 0, value);
        break;
      case DGM_ATTR_REQUIRED_SKILL_1_LEVEL:
        setRequiredSkillLevel(skill, 0, value);
        break;
      case DGM_ATTR_REQUIRED_SKILL_2:
        setRequiredSkill(skill, 1, value);
        break;
      case DGM_ATTR_REQUIRED_SKILL_2_LEVEL:
        setRequiredSkillLevel(skill, 1, value);
        break;
      case DGM_ATTR_REQUIRED_SKILL_3:
        setRequiredSkill(skill, 2, value);
        break;
      case DGM_ATTR_REQUIRED_SKILL_3_LEVEL:
        setRequiredSkillLevel(skill, 2, value);
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
  logger: Logger,
  skills: Map<number, PartialSkill>,
  strictMode: boolean,
) {
  const defaultSeverity = strictMode
    ? ErrorSeverity.THROW
    : ErrorSeverity.ERROR;
  for (const [id, skill] of skills) {
    if (skill.rank == null) {
      handleFailure(
        logger,
        defaultSeverity,
        `Undefined rank for ${id}:${skill.name}.`,
      );
      skill.rank = 1;
    }
    for (let i = 0; i < skill.requiredSkills.length; i++) {
      const reqSkill = skill.requiredSkills[i];
      let pruneRequirement = false;
      if (reqSkill == null) {
        handleFailure(
          logger,
          getSeverityForEmptyRequiredSkill(id, defaultSeverity),
          `Required skill ${i} for ${id}:${skill.name} is null.`,
        );
        pruneRequirement = true;
      } else if (reqSkill.skill == null) {
        handleFailure(
          logger,
          defaultSeverity,
          `Required skill ${i} for ${id}:${skill.name} has a null id.`,
        );
        pruneRequirement = true;
      } else if (reqSkill.level == null) {
        handleFailure(
          logger,
          defaultSeverity,
          `Required skill ${i} for ${id}:${skill.name} has a null level.`,
        );
        pruneRequirement = true;
      }
      if (pruneRequirement) {
        skill.requiredSkills.splice(i, 1);
        i--;
      }
    }
  }
}

function getSeverityForEmptyRequiredSkill(
  skillId: number,
  defaultSeverity: ErrorSeverity,
) {
  switch (skillId) {
    // For some reason, they only specify a requirement in the second slot,
    // but not the first
    case TYPE_FLEET_COMPRESSION_LOGISTICS:
    case TYPE_GAS_DECOMPRESSION_EFFICIENCY:
      return ErrorSeverity.SILENT;
    default:
      return defaultSeverity;
  }
}

function handleFailure(
  logger: Logger,
  severity: ErrorSeverity,
  message: string,
) {
  switch (severity) {
    case ErrorSeverity.THROW:
      throw new Error(`SDE verification failure: ${message}`);
    case ErrorSeverity.WARN:
      logger.warn(message);
      break;
    case ErrorSeverity.INFO:
      logger.info(message);
      break;
    case ErrorSeverity.SILENT:
      // Do nothing
      break;
  }
}

function setRequiredSkill(
  skill: PartialSkill,
  position: number,
  requiredSkill: number,
) {
  getRequiredSkill(skill, position).skill = requiredSkill;
}

function setRequiredSkillLevel(
  skill: PartialSkill,
  position: number,
  level: number,
) {
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
  group: number;
  rank: number | null;
  requiredSkills: {
    pos: number;
    skill: number | null;
    level: number | null;
  }[];
}

enum ErrorSeverity {
  SILENT,
  INFO,
  WARN,
  ERROR,
  THROW,
}

const TYPE_FLEET_COMPRESSION_LOGISTICS = 62453;
const TYPE_GAS_DECOMPRESSION_EFFICIENCY = 62452;
