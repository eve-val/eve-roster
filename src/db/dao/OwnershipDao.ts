
import { Tnex, val } from '../../db/tnex';
import { Dao } from '../dao';
import { account, character, ownership, pendingOwnership } from '../tables';
import { updateGroupsForAccount } from '../../domain/account/accountGroups';

export default class OwnershipDao {
  constructor(
      private _dao: Dao,
      ) {}

  ownCharacter(
      db: Tnex,
      characterId: number,
      accountId: number,
      ownerHash: string,
      isMain: boolean,
  ) {
    return db.transaction(db => {
      return db
          .insert(ownership, {
            ownership_account: accountId,
            ownership_character: characterId,
            ownership_ownerHash: ownerHash,
            ownership_opsec: false,
          })
      .then(() => {
        return this._dao.log.logEvent(
            db, accountId, 'OWN_CHARACTER', characterId);
      })
      .then(() => {
        // TODO: Change this to automatically apply if there are no other
        // chars owned by the account
        if (isMain) {
          return this._dao.account.setMain(db, accountId, characterId);
        } else {
          return updateGroupsForAccount(db, accountId);
        }
      });
    });
  }

  deleteOwnership(
      db: Tnex, characterId: number, accountId: number, newAccountId: number) {
    return db.transaction(db => {
      return db
          .select(ownership)
          .leftJoin(account, 'account_id', '=', 'ownership_account')
          .where('ownership_account', '=', val(accountId))
          .columns('account_mainCharacter', 'ownership_character')
          .run()
      .then(rows => {
        // Designate a new main if necessary
        if (rows.length > 1 && characterId == rows[0].account_mainCharacter) {
          for (const row of rows) {
            if (row.ownership_character != row.account_mainCharacter) {
              return this._dao.account.setMain(
                  db, accountId, row.ownership_character);
            }
          }
        }
      })
      .then(() => {
        return db
            .del(ownership)
            .where('ownership_character', '=', val(characterId))
            .run();
      })
      .then(() => {
        return this._dao.account.deleteIfEmpty(db, accountId, newAccountId);
      })
      .then(() => {
      })
    });
  }

  createPendingOwnership(
      db: Tnex, characterId: number, accountId: number, ownerHash: string) {
    return db
        .upsert(pendingOwnership, {
          pendingOwnership_character: characterId,
          pendingOwnership_account: accountId,
          pendingOwnership_ownerHash: ownerHash,
        }, 'pendingOwnership_character');
  }

  getPendingOwnership(db: Tnex, account: number, character: number) {
    return db
        .select(pendingOwnership)
        .leftJoin(ownership,
            'ownership_character', '=', 'pendingOwnership_character')
        .where('pendingOwnership_account', '=', val(account))
        .andWhere('pendingOwnership_character', '=', val(character))
        .columns('ownership_account', 'pendingOwnership_ownerHash')
        .fetchFirst();
  }

  deletePendingOwnership(db: Tnex, account: number, character: number) {
    return db
        .del(pendingOwnership)
        .where('pendingOwnership_account', '=', val(account))
        .andWhere('pendingOwnership_character', '=', val(character))
        .run()
    .then(delCount => {
      if (delCount != 1) {
        throw new Error(`Delete count was ${delCount} when trying to delete`
            + ` pending transfer for char ${character} on account ${account}.`);
      }
    });
  }

  getAccountPendingOwnership(db: Tnex, accountId: number) {
    return db
        .select(pendingOwnership)
        .join(character, 'character_id', '=', 'pendingOwnership_character')
        .where('pendingOwnership_account', '=', val(accountId))
        .columns(
            'pendingOwnership_character',
            'character_name',
            )
        .run();
  }
}
