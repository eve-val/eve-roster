import _ from "underscore";

const GROUP_DISPLAY_ORDER: { groupId: string; name: string }[] = [
  { groupId: "257", name: "Spaceship Command" },
  { groupId: "275", name: "Navigation" },
  { groupId: "1216", name: "Engineering" },
  { groupId: "1240", name: "Subsystems" },
  { groupId: "1210", name: "Armor" },
  { groupId: "1209", name: "Shields" },

  { groupId: "1213", name: "Targeting" },
  { groupId: "255", name: "Gunnery" },
  { groupId: "256", name: "Missiles" },
  { groupId: "273", name: "Drones" },
  { groupId: "272", name: "Electronic Systems" },
  { groupId: "1217", name: "Scanning" },

  { groupId: "269", name: "Rigging" },
  { groupId: "278", name: "Social" },
  { groupId: "258", name: "Fleet Support" },
  { groupId: "266", name: "Corporation Management" },
  { groupId: "274", name: "Trade" },
  { groupId: "1220", name: "Neural Enhancement" },

  { groupId: "268", name: "Production" },
  { groupId: "270", name: "Science" },
  { groupId: "1218", name: "Resource Processing" },
  { groupId: "1241", name: "Planet Management" },
  { groupId: "1545", name: "Structure Management" },
];

const GROUP_DISPLAY_MAP: {
  [index: string]: { name: string; position: number };
} = {};
for (let i = 0; i < GROUP_DISPLAY_ORDER.length; i++) {
  const group = GROUP_DISPLAY_ORDER[i];
  GROUP_DISPLAY_MAP[group.groupId] = {
    name: group.name,
    position: i,
  };
}

import * as api from "../../shared/route/api/character/skills_GET.js";

export interface Skill extends api.Skill {
  queuedLevel?: number;
}
export interface SkillGroup {
  name: string;
  position: number;
  skills: Skill[];
}

export interface QueueItem extends api.QueueEntryJson {
  skill?: Skill;
}

/**
 * Groups the character's skills into their associated skill groups,
 * e.g. 'Engineering'. Sorts the groups based on the ordering provided in
 * GROUP_DISPLAY_ORDER.
 */
export function groupifySkills(skills: Skill[]): SkillGroup[] {
  const skillGroupMap = _.groupBy(skills, "group");

  const skillGroups: SkillGroup[] = [];
  for (const groupId in skillGroupMap) {
    const skills = skillGroupMap[groupId];

    // Sort skills by name
    skills.sort((a: Skill, b: Skill) => a.name.localeCompare(b.name));

    // Attach group name and sort position
    let groupDescriptor = GROUP_DISPLAY_MAP[groupId];
    if (groupDescriptor == undefined) {
      const fallbackName = groupId == "null" ? "unknown" : groupId;
      groupDescriptor = {
        name: `Skill group ${fallbackName}`,
        position: GROUP_DISPLAY_ORDER.length,
      };
    }

    skillGroups.push({
      name: groupDescriptor.name,
      position: groupDescriptor.position,
      skills: skills,
    });
  }

  // Sort groups by position
  skillGroups.sort((a: SkillGroup, b: SkillGroup): number => {
    if (a.position > b.position) {
      return 1;
    } else if (b.position > a.position) {
      return -1;
    } else {
      // Unknown groups will all have the same position; sort them by name
      return a.name.localeCompare(b.name);
    }
  });

  return skillGroups;
}
