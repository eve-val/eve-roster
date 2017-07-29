import Promise = require('bluebird');

import { Tnex, val } from '../tnex';
import { Dao } from '../dao';
import { skillsheet, Skillsheet } from './tables';

export interface SkillsheetEntry {
  skillsheet_skill: number,
  skillsheet_level: number,
  skillsheet_skillpoints: number,
}

export default class SkillQueueDao {
  constructor(
      private _parent: Dao,
      ) {
  }

  get(db: Tnex, characterId: number): Promise<SkillsheetEntry[]> {
    return db
        .select(skillsheet)
        .where('skillsheet_character', '=', val(characterId))
        .columns(
            'skillsheet_skill',
            'skillsheet_level',
            'skillsheet_skillpoints',
            )
        .run();
  }

  set(db: Tnex, characterId: number, skills: Skillsheet[]) {
    return db
        .replace(skillsheet, 'skillsheet_character', characterId, skills);
  }
}
