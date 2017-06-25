import Promise = require('bluebird');

import * as _ from '../util/underscore';
import { Tnex, val } from '../tnex';
import { Dao } from '../dao';
import * as t from '../dao/tables';


export interface BasicRosterCharacter {
  character_id: number,
  character_name: string,
  character_corporationId: number,
  character_startDate: number | null,
  character_logonDate: number | null,
  character_logoffDate: number | null,
  character_siggyScore: number | null,
  character_titles: string | null,
  killboard_killsInLastMonth: number | null,
  killboard_killValueInLastMonth: number | null,
  killboard_lossesInLastMonth: number | null,
  killboard_lossValueInLastMonth: number | null,
  memberCorporation_membership: string | null,
}

export interface OwnedRosterCharacter extends BasicRosterCharacter {
  account_id: number,
  account_mainCharacter: number,
  account_activeTimezone: string | null,
  citadel_name: string | null,
  ownership_opsec: number,
  trialCheck_group: string | null,
}

export default class RosterDao {
  constructor(
      private _parent: Dao,
      ) {
  }

  getCharactersOwnedByMembers(db: Tnex): Promise<OwnedRosterCharacter[]> {
    return db.select(t.account)
        .join(
            // This complex subquery is required because we want to select the
            // characters of all accounts that own 1 or more member character.
            // In particular, in the case where an account's main has left the
            // corp but one of their alts is still a member, we want to include
            // that account (and all of that account's characters).
            db.subselect(t.memberCorporation, 'memberAccount')
                .join(t.character,
                    'character_corporationId',
                    '=',
                    'memberCorporation_corporationId')
                .join(t.ownership,'ownership_character', '=', 'character_id')
                .join(t.account, 'account_id', '=', 'ownership_account')
                .distinct('account_id')
                .columnAs('account_id', 'memberAccount_id'),
            'memberAccount_id', '=', 'account_id')
        .join(t.ownership, 'ownership_account', '=', 'memberAccount_id')
        .join(t.character, 'character_id', '=', 'ownership_character')
        .leftJoin(t.citadel, 'citadel_id', '=', 'account_homeCitadel')
        .leftJoin(t.killboard, 'killboard_character', '=', 'character_id')
        .leftJoin(t.memberCorporation,
            'memberCorporation_corporationId', '=', 'character_corporationId')
        .leftJoin(
            db.subselect(t.accountGroup, 'trialCheck')
                .join(t.account, 'account_id', '=', 'accountGroup_account')
                .where('accountGroup_group', '=', val('provisional_member'))
                .columnAs('account_id', 'trialCheck_account')
                .columnAs('accountGroup_group', 'trialCheck_group'),
            'trialCheck_account', '=', 'account_id')
        .columns(
            'character_id',
            'character_name',
            'character_corporationId',
            'character_startDate',
            'character_logonDate',
            'character_logoffDate',
            'character_siggyScore',
            'character_titles',
            'killboard_killsInLastMonth',
            'killboard_killValueInLastMonth',
            'killboard_lossesInLastMonth',
            'killboard_lossValueInLastMonth',
            'memberCorporation_membership',
            'account_id',
            'account_mainCharacter',
            'account_activeTimezone',
            'citadel_name',
            'ownership_opsec',
            'trialCheck_group',
            )
        .run();
  }

  getUnownedCorpCharacters(db: Tnex): Promise<BasicRosterCharacter[]> {
    return db
        .select(t.memberCorporation)
        .join(t.character,
            'character_corporationId', '=', 'memberCorporation_corporationId')
        .leftJoin(t.ownership, 'ownership_character', '=', 'character_id')
        .leftJoin(t.killboard, 'killboard_character', '=', 'character_id')
        .whereNull('ownership_account')
        .columns(
            'character_id',
            'character_name',
            'character_corporationId',
            'character_startDate',
            'character_logonDate',
            'character_logoffDate',
            'character_siggyScore',
            'character_titles',
            'killboard_killsInLastMonth',
            'killboard_killValueInLastMonth',
            'killboard_lossesInLastMonth',
            'killboard_lossValueInLastMonth',
            'memberCorporation_membership',
            )
        .run()
  }

  // Get all unique corporation IDs in the roster, which can include
  // non-member corporations if someone leaves but their character is still
  // in the roster. Or for opsec alts, etc.
  getRosterCharacterCorps(db: Tnex) {
    return db
        .select(t.character)
        .distinct('character_corporationId')
        .columns('character_corporationId')
        .run()
    .then(rows => {
      return _.pluck(rows, 'character_corporationId');
    });
  }
}
