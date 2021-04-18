import { Tnex, val } from "../../db/tnex";
import { Dao } from "../dao";
import { skillsheet, Skillsheet, sdeType } from "../tables";

export interface SkillsheetEntry {
  skillsheet_skill: number;
  skillsheet_level: number;
  skillsheet_skillpoints: number;
  styp_name: string | null;
  styp_group: number | null;
}

export default class SkillQueueDao {
  constructor(private _parent: Dao) {}

  get(db: Tnex, characterId: number): Promise<SkillsheetEntry[]> {
    return db
      .select(skillsheet)
      .leftJoin(sdeType, "styp_id", "=", "skillsheet_skill")
      .where("skillsheet_character", "=", val(characterId))
      .columns(
        "skillsheet_skill",
        "skillsheet_level",
        "skillsheet_skillpoints",
        "styp_name",
        "styp_group"
      )
      .run();
  }

  set(db: Tnex, characterId: number, skills: Skillsheet[]) {
    return db.replace(skillsheet, "skillsheet_character", characterId, skills);
  }
}
