import Promise = require('bluebird');

import { Dao } from '../dao';
import { Tnex, Nullable, val } from '../tnex';
import {
    accessToken,
    account,
    character,
    Character,
    citadel,
    memberCorporation,
    ownership,
    skillsheet,
} from './tables';
import { pluck } from '../util/underscore';

export default class CharacterDao {
  constructor(
      private _parent: Dao,
      ) {
  }

  getCharacterIdsOwnedByAccount(db: Tnex, accountId: number) {
    return db
        .select(account)
        .join(ownership, 'ownership_account', '=', 'account_id')
        .join(character, 'character_id', '=', 'ownership_character')
        .where('account_id', '=', val(accountId))
        .andWhere('character_deleted', '=', val(false))
        .columns('character_id')
        .run()
    .then(rows => {
      return pluck(rows, 'character_id');
    });
  }

  getAllCharacterIds(db: Tnex) {
    return db
        .select(character)
        .where('character_deleted', '=', val(false))
        .columns('character_id')
        .run()
    .then(rows => pluck(rows, 'character_id'));
  }

  getCharactersOwnedByAccount(db: Tnex, accountId: number) {
    return db
        .select(account)
        .join(ownership, 'ownership_account', '=', 'account_id')
        .join(character, 'character_id', '=', 'ownership_character')
        .leftJoin(accessToken, 'accessToken_character', '=', 'character_id')
        .leftJoin(memberCorporation,
            'memberCorporation_corporationId', '=', 'character_corporationId')
        .where('account_id', '=', val(accountId))
        .andWhere('character_deleted', '=', val(false))
        .columns(
            'character_id',
            'character_name',
            'character_corporationId',
            'character_titles',
            'character_deleted',
            'ownership_opsec',
            'memberCorporation_membership',
            'account_mainCharacter',
            )
        .run();
  }

  getCoreData(db: Tnex, characterId: number) {
    return db
        .select(character)
        .leftJoin(ownership, 'ownership_character', '=', 'character_id')
        .leftJoin(account, 'account_id', '=', 'ownership_account')
        .leftJoin(memberCorporation,
            'memberCorporation_corporationId', '=', 'character_corporationId')
        .where('character_id', '=', val(characterId))
        .columns(
            'account_id',
            'character_corporationId',
            'memberCorporation_membership'
            )
        .fetchFirst();
  }

  getDetailedCharacterStats(db: Tnex, id: number) {
    return db
        .select(character)
        .leftJoin(ownership, 'ownership_character', '=', 'character_id')
        .leftJoin(account, 'account_id', '=', 'ownership_account')
        .leftJoin(citadel, 'citadel_id', '=', 'account_homeCitadel')
        .leftJoin(skillsheet, 'skillsheet_character', '=', 'character_id')
        .leftJoin(
            db.subselect(skillsheet, 'sp')
                .sum('skillsheet_skillpoints', 'sp_total')
                .columnAs('skillsheet_character', 'sp_character')
                .groupBy('skillsheet_character')
                .where('skillsheet_character', '=', val(id)),
            'sp_character', '=', 'character_id')
        .where('character_id', '=', val(id))
        .columns(
            'character_id',
            'character_name',
            'character_corporationId',
            'character_titles',
            'account_id',
            'account_mainCharacter',
            'account_activeTimezone',
            'citadel_id',
            'citadel_name',
            'sp_total',
            )
      .fetchFirst()
  }

  upsertCharacter(db: Tnex, upserted: Character) {
    return db.upsert(character, upserted, 'character_id');
  }

  updateCharacter(db: Tnex, id: number, values: Partial<Character>) {
    return db
        .update(character, values)
        .where('character_id', '=', val(id))
        .run();
  }

  setCharacterIsOpsec(db: Tnex, id:number, isOpsec:boolean) {
    return db
        .update(ownership, { ownership_opsec: isOpsec })
        .where('ownership_character', '=', val(id))
        .run();
  }

  getOwner(db: Tnex, characterId: number) {
    return db
        .select(character)
        .leftJoin(ownership, 'ownership_character', '=', 'character_id')
        .leftJoin(account, 'account_id', '=', 'ownership_account')
        .where('character_id', '=', val(characterId))
        .columns('account_id')
        .fetchFirst();
  }

  getMemberCharacters(db: Tnex) {
    return db
        .select(memberCorporation)
        .join(character, 
            'character_corporationId',
            '=',
            'memberCorporation_corporationId')
        .columns('character_id', 'character_corporationId')
        .run();
  }
}
