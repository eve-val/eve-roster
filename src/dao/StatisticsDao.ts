import Promise = require('bluebird');

import { Tnex, val } from '../tnex';
import { Dao } from '../dao';
import { account, character, skillsheet, ownership,} from '../dao/tables';
import { MEMBER_GROUP } from '../route-helper/specialGroups';

export interface SkillRequirement {
  skill: number,
  minLevel: number,
}

export default class SkillQueueDao {
  constructor(
      private _parent: Dao,
      ) {
  }

  getTrainedPercentage(db: Tnex, requirements: SkillRequirement[]) {
    // The for-loop dynamism below means that we have to use the raw knex
    // interface instead of Tnex :(

    let knex = db.knex();

    let query = knex('account')
        .select(
            'mainCharacter.id as id',
            'mainCharacter.name as name',
            'characterCombatStats.killsInLastMonth as kills')
        .join(
            // Subselect: all member accounts
            knex.select('account.id')
                .from('account')
                .join('accountGroup',
                    'accountGroup.account', '=', 'account.id')
                .where('accountGroup.group', '=', MEMBER_GROUP)
                .as('memberAccount'),
            'memberAccount.id', '=', 'account.id')
        .join('ownership', 'ownership.account', '=', 'account.id')
        .join('character', 'character.id', '=', 'ownership.character')
        .join('character as mainCharacter',
            'mainCharacter.id', '=', 'account.mainCharacter')
        .join('characterCombatStats',
            'characterCombatStats.character', '=', 'mainCharacter.id')
        .distinct('account.id')
        .orderBy('characterCombatStats.killsInLastMonth', 'desc');

    for (let i = 0; i < requirements.length; i++) {
      let r = requirements[i];
      let alias = `ss${i}`;

      query = query
          .join(`skillsheet as ${alias}`,
              `${alias}.character`, '=', 'character.id')
          .where(`${alias}.skill`, '=', r.skill)
          .where(`${alias}.level`, '>=', r.minLevel)
    }

    return query;
  }
}
