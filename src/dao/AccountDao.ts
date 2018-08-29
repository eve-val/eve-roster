import { Dao } from '../dao';
import { Tnex, val, DEFAULT_NUM } from '../tnex';
import {
    account,
    accountGroup,
    accountLog,
    character,
    groupExplicit,
    pendingOwnership,
    ownership
} from './tables';
import { updateGroupsForAccount } from '../domain/accountGroups/accountGroups';
import { ADMIN_GROUP } from '../route-helper/specialGroups';
import { buildLoggerFromFilename } from '../logs/buildLogger';

const logger = buildLoggerFromFilename(__filename);

export interface AccountDetailsRow {
  id: number,
  created: number,
  mainCharacter: number,
  activeTimezone: string,
  homeCitadel: number,
};

export default class AccountDao {
  constructor(
      private _dao: Dao,
      ) {
  }

  create(db: Tnex, mainCharacterId: number) {
    let id: number;
    return db.transaction(db => {
      return db
          .insert(account, {
            account_id: DEFAULT_NUM,
            account_created: Date.now(),
            account_mainCharacter: mainCharacterId,
            account_activeTimezone: null,
            account_homeCitadel: null,
          }, 'account_id')
      .then(_id => {
        id = _id;
        return this._dao.log.logEvent(db, id, 'CREATE_ACCOUNT');
      })
      .then(() => {
        if (id == 1) {
          logger.info('First account login! Setting as admin...');
          return db
              .insert(groupExplicit, {
                groupExplicit_id: DEFAULT_NUM,
                groupExplicit_account: id,
                groupExplicit_group: ADMIN_GROUP,
              }, 'groupExplicit_id')
        }
        return -1;
      })
      .then(() => {
        return id;
      });
    });
  }

  getDetails(db: Tnex, accountId: number) {
    return db
        .select(account)
        .columns(
            'account_id',
            'account_created',
            'account_mainCharacter',
            )
        .where('account_id', '=', val(accountId))
        .fetchFirst();
  }

  getAlts(db: Tnex, accountId: number) {
    return db
        .select(account)
        .join(ownership, 'ownership_account', '=', 'account_id')
        .join(character, 'character_id', '=', 'ownership_character')
        .where('account_id', '=', val(accountId))
        .andWhere('ownership_character', '!=', 'account_mainCharacter')
        .columns(
            'character_id',
            'character_name',
            'ownership_opsec')
        .run();
  }

  getMain(db: Tnex, accountId: number) {
    return db
        .select(account)
        .join(character, 'character_id', '=', 'account_mainCharacter')
        .where('account_id', '=', val(accountId))
        .columns('character_id', 'character_name')
        .fetchFirst()
  }

  setMain(db: Tnex, accountId: number, mainCharacterId: number) {
    return db.transaction(db => {
      return db
          .update(account, { account_mainCharacter: mainCharacterId })
          .where('account_id', '=', val(accountId))
          .run()
      .then(updateCount => {
        if (updateCount != 1) {
          throw new Error(
              `No rows updated when setting main of account ${accountId}.`);
        }
        return this._dao.log.logEvent(
            db, accountId, 'DESIGNATE_MAIN', mainCharacterId);
      })
      .then(() => {
        return updateGroupsForAccount(db, accountId);
      });
    });
  }

  setActiveTimezone(db: Tnex, accountId: number, timezone: string) {
    return db
        .update(account, { account_activeTimezone: timezone })
        .where('account_id', '=', val(accountId))
        .run();
  }

  setHomeCitadel(db: Tnex, accountId: number, citadelId: number) {
    return db
        .update(account, { account_homeCitadel: citadelId })
        .where('account_id', '=', val(accountId))
        .run();
  }

  deleteIfEmpty(db: Tnex, accountId: number, newAccountId: number) {
    return db.transaction(db => {
      return db
          .select(ownership)
          .count('ownership_character', 'ownedCount')
          .where('ownership_account', '=', val(accountId))
          .fetchFirst()
      .then(row => {
        if (row != null && row.ownedCount > 0) {
            return 0; // Not empty, don't delete
        }

        return db
            .update(accountLog, {
              accountLog_account: newAccountId,
              accountLog_originalAccount: accountId,
            })
            .where('accountLog_account', '=', val(accountId))
            .run()
        .then(() => {
          return db
              .del(accountGroup)
              .where('accountGroup_account', '=', val(accountId))
              .run();
        })
        .then(() => {
          return db
              .del(groupExplicit)
              .where('groupExplicit_account', '=', val(accountId))
              .run();
        })
        .then(() => {
          return db
              .del(pendingOwnership)
              .where('pendingOwnership_account', '=', val(accountId))
              .run();
        })
        .then(() => {
          return db
              .del(account)
              .where('account_id', '=', val(accountId))
              .run();
        })
        .then(() => {
          return 1;
        })
      });
    });
  }

}
