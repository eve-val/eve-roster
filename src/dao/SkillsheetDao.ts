import Promise = require('bluebird');

import { Tnex, val } from '../tnex';
import { Dao } from '../dao';
import { skillsheet, Skillsheet } from './tables';

export interface SkillsheetEntry {

}

export default class SkillQueueDao {
  constructor(
      private _parent: Dao,
      ) {
  }

  get(db: Tnex, characterId: number) {
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
    for (let skill of skills) {
      if (skill.skillsheet_character != characterId) {
        throw new Error(
            `skillsheet_character is ${skill.skillsheet_character}`
                + ` but was expecting ${characterId}.`)
      }
    }
    return db.transaction(db => {
      return db
          .del(skillsheet)
          .where('skillsheet_character', '=', val(characterId))
          .run()
      .then(() => {
        return db
            .batchInsert(skillsheet, skills, 100)
      });
    });
  }
}
