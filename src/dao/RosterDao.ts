import Bluebird = require('bluebird');

import * as _ from '../util/underscore';
import { Tnex, val } from '../tnex';
import { Dao } from '../dao';
import * as t from './tables';
import { pluck } from '../util/underscore';
import { MEMBER_GROUP } from '../domain/account/specialGroups';


export interface BasicRosterCharacter {
  character_id: number,
  character_name: string,
  character_corporationId: number,
  character_startDate: number | null,
  character_logonDate: number | null,
  character_logoffDate: number | null,
  character_siggyScore: number | null,
  character_titles: string[] | null,
  cstats_killsInLastMonth: number | null,
  cstats_killValueInLastMonth: number | null,
  cstats_lossesInLastMonth: number | null,
  cstats_lossValueInLastMonth: number | null,
  memberCorporation_membership: string | null,
  accessToken_needsUpdate: boolean | null,
}

export interface OwnedRosterCharacter extends BasicRosterCharacter {
  account_id: number,
  account_mainCharacter: number,
  account_activeTimezone: string | null,
  citadel_name: string | null,
  ownership_opsec: boolean,
  trialCheck_group: string | null,
}

export default class RosterDao {
  constructor(
      private _parent: Dao,
      ) {
  }

  getMemberAccounts(db: Tnex) {
    return db
        .select(t.account)
        .join(t.accountGroup, 'accountGroup_account', '=', 'account_id')
        .where('accountGroup_group', '=', val(MEMBER_GROUP))
        .columns('account_id')
        .run()
    .then(rows => {
        return pluck(rows, 'account_id');
    });
  }

  getCharacterIdsOwnedByMemberAccounts(db: Tnex) {
    return db
        .select(t.account)
        .join(t.accountGroup, 'accountGroup_account', '=', 'account_id')
        .join(t.ownership, 'ownership_account', '=', 'account_id')
        .join(t.character, 'character_id', '=', 'ownership_character')
        .where('accountGroup_group', '=', val(MEMBER_GROUP))
        .andWhere('character_deleted', '=', val(false))
        .columns('character_id')
        .run()
    .then(rows => pluck(rows, 'character_id'));
  }

  getCharactersOwnedByAssociatedAccounts(
      db: Tnex): Bluebird<OwnedRosterCharacter[]> {
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
                .columnAs('account_id', 'memberAccount_mid'),
            'memberAccount_mid', '=', 'account_id')
        .join(t.ownership, 'ownership_account', '=', 'memberAccount_mid')
        .join(t.character, 'character_id', '=', 'ownership_character')
        .leftJoin(t.citadel, 'citadel_id', '=', 'account_homeCitadel')
        .leftJoin(t.combatStats, 'cstats_character', '=', 'character_id')
        .leftJoin(t.accessToken, 'accessToken_character', '=', 'character_id')
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
            'cstats_killsInLastMonth',
            'cstats_killValueInLastMonth',
            'cstats_lossesInLastMonth',
            'cstats_lossValueInLastMonth',
            'memberCorporation_membership',
            'account_id',
            'account_mainCharacter',
            'account_activeTimezone',
            'citadel_name',
            'ownership_opsec',
            'trialCheck_group',
            'accessToken_needsUpdate',
            )
        .run();
  }

  getUnownedCorpCharacters(db: Tnex): Bluebird<BasicRosterCharacter[]> {
    return db
        .select(t.memberCorporation)
        .join(t.character,
            'character_corporationId', '=', 'memberCorporation_corporationId')
        .leftJoin(t.ownership, 'ownership_character', '=', 'character_id')
        .leftJoin(t.combatStats,
            'cstats_character', '=', 'character_id')
        .leftJoin(t.accessToken, 'accessToken_character', '=', 'character_id')
        .whereNull('ownership_account')
        .andWhere('character_deleted', '=', val(false))
        .columns(
            'character_id',
            'character_name',
            'character_corporationId',
            'character_startDate',
            'character_logonDate',
            'character_logoffDate',
            'character_siggyScore',
            'character_titles',
            'cstats_killsInLastMonth',
            'cstats_killValueInLastMonth',
            'cstats_lossesInLastMonth',
            'cstats_lossValueInLastMonth',
            'memberCorporation_membership',
            'accessToken_needsUpdate',
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

  getCorpDirectors(db: Tnex, corporation: number) {
    return db.select(t.character)
        .join(t.accessToken, 'accessToken_character', '=', 'character_id')
        .where('character_corporationId', '=', val(corporation))
        .whereContains('character_roles', '@>', ['Director'])
        .columns(
          'character_id',
          'character_name',
          'accessToken_scopes',
          'accessToken_needsUpdate',
        )
        .run();
  }

  getMemberCorpDirectors(db: Tnex) {
    return db
        .select(t.memberCorporation)
        .join(t.character,
              'character_corporationId', '=', 'memberCorporation_corporationId')
        .leftJoin(t.accessToken, 'accessToken_character', '=', 'character_id')
        .whereContains('character_roles', '@>', ['Director'])
        .columns(
            'character_id',
            'character_name',
            'character_corporationId',
            'accessToken_scopes',
            'accessToken_needsUpdate',
            )
        .run();
  }
}
