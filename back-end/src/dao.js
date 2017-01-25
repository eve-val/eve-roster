// dao.js - Functions for manipulating and accessing data in the database.
// All functions in the module return Promises from the knexJS library. 
// To use, code should be along the lines of:
//    dao = require('./dao.js');
//    dao.getCitadels().then(function(rows) {
//      console.log(rows);    
//    }).catch(function(error) {
//      console.error(error);
//    });
//
// Access functions report arrays of objects, where each object represents
// a selected row, in the function passed to then(). Modify functions report
// the number of modified rows.

const path = require('path');

const _ = require('underscore');

const accountRoles = require('./data-source/accountRoles');
const knex = require('./util/knex-loader');

const CONFIG = require('../src/config-loader').load();
const allCorpIds = _.pluck(
    CONFIG.primaryCorporations.concat(CONFIG.altCorporations),
    'id'
);
const BASIC_CHARACTER_COLUMNS = [
  'character.id',
  'character.name',
  'character.corporationId',
  'character.startDate',
  'character.logonDate',
  'character.logoffDate',
  'character.killsInLastMonth',
  'character.killValueInLastMonth',
  'character.lossesInLastMonth',
  'character.lossValueInLastMonth',
  'character.siggyScore',
];
const OWNED_CHARACTER_COLUMNS = BASIC_CHARACTER_COLUMNS.concat([
  'account.activeTimezone',
  'citadel.name as homeCitadel',

  'account.id as accountId',
  'account.mainCharacter',
]);

const LOGGABLE_EVENTS = [
  'CREATE_ACCOUNT',
  'OWN_CHARACTER',
  'DESIGNATE_MAIN',
  'MERGE_ACCOUNTS',
  'MODIFY_ROLES',
  'GAIN_MEMBERSHIP',
  'LOSE_MEMBERSHIP',
];

function Dao(builder) {
  this.builder = builder;
}
Dao.prototype = {
  transaction(callback) {
    if (this == module.exports) {
      return this.builder.transaction((trx) => {
        return callback(new Dao(trx));
      });
    } else {
      // Already in a transaction, just continue using it
      return callback(this);
    }
  },

  commit() {
    return this.builder.commit();
  },

  rollback() {
    return this.builder.rollback();
  },

  batchInsert(table, rows, chunkSize) {
    let work = knex.batchInsert(table, rows, chunkSize);
    if (this.builder != knex) {
      work = work.transacting(this.builder);
    }
    return work;
  },

  getCitadels() {
    return this.builder('citadel').select();
  },

  getCitadelByName(name) {
    return this.builder('citadel').select().where({name: name});
  },

  getCharacters() {
    return this.builder('character').select();
  },

  getCharacterByName(name) {
    return this.builder('character').select().where({name: name});
  },

  getCharacterById(id) {
    return this.builder('character').select().where({id: id});
  },

  upsertCharacter(id, name, extraColumns) {
    let fullVals = Object.assign(extraColumns || {}, {
      id: id,
      name: name,
    });

    return this._upsert('character', fullVals, 'id');
  },

  updateCharacter(id, vals) {
    return this.builder('character').update(vals).where('id', '=', id);
  },

  upsertAccessTokens(characterId, refreshToken, accessToken, expiresIn) {
    return this._upsert('accessToken', {
      character: characterId,
      refreshToken: refreshToken,
      accessToken: accessToken,
      accessTokenExpires: Date.now() + expiresIn * 1000,
      needsUpdate: false,
    }, 'character');
  },

  createAccount() {
    let id;
    return this.transaction(trx => {
      return trx.builder('account')
          .insert({ created: Date.now(), })
      .then(([_id]) => {
        id = _id;
        return trx.logEvent(id, 'CREATE_ACCOUNT');
      })
      .then(() => {
        return id;
      });
    });
  },

  getAccountDetails(accountId) {
    return this.builder('account')
        .select(
            'id',
            'created',
            'mainCharacter',
            'activeTimezone',
            'homeCitadel')
        .where('id', '=', accountId);
  },

  ownCharacter(characterId, accountId, isMain) {
    return this.transaction(trx => {
      return trx.builder('ownership').insert({
        account: accountId,
        character: characterId,
      })
      .then(() => {
        return trx.logEvent(accountId, 'OWN_CHARACTER', characterId);
      })
      .then(() => {
        // TODO: Change this to automatically apply if there are no other
        // chars owned by the account
        if (isMain) {
          return trx.setAccountMain(accountId, characterId);
        } else {
          return accountRoles.updateAccount(trx, accountId);
        }
      });
    });
  },

  getOwner(characterId) {
    return this.builder('character')
        .select('account.id')
        .leftJoin('ownership', 'ownership.character', '=', 'character.id')
        .leftJoin('account', 'account.id', '=', 'ownership.account')
        .where('character.id', '=', characterId)
    .then(([row]) => {
      return row;
    });
  },

  getOwnerByCharacterName(characterName) {
    return this.builder('character')
        .select('account.id', 'account.created')
        .leftJoin('ownership', 'ownership.character', '=', 'character.id')
        .leftJoin('account', 'account.id', '=', 'ownership.account')
        .where('character.name', '=', characterName)
    .then(([row]) => {
      return row;
    });
  },

  setAccountMain(accountId, mainCharacterId) {
    return this.transaction(trx => {
      return trx.builder('account')
          .where({ id: accountId })
          .update({ mainCharacter: mainCharacterId })
      .then(updateCount => {
        if (updateCount != 1) {
          throw new Error(
              `No rows updated when setting main of account ${accountId}.`);
        }
        return trx.logEvent(accountId, 'DESIGNATE_MAIN', mainCharacterId);
      })
      .then(() => {
        return accountRoles.updateAccount(trx, accountId);
      });
    });
  },

  setAccountCitadel(accountId, citadelId) {
    return this.builder('account')
        .where({ id: accountId })
        .update({ homeCitadel: citadelId });
  },

  setAccountActiveTimezone(accountId, activeTimezone) {
    return this.builder('account')
        .where({ id: accountId })
        .update({ activeTimezone: activeTimezone });
  },

  getPrivilegesForAccount(accountId) {
    // This query has an odd structure because we need to select all privileges,
    // not just those that have been granted to this account. This is because
    // some privileges are inherently granted to the owner of the resource even
    // if the owner doesn't have that privilege in general. Thus, we need to
    // know the owner level for every privilege in order to know whether the
    // account has access.
    return this.builder('privilege')
        .select(
            'privilege.name',
            'grantedPrivs.level',
            'privilege.ownerLevel')
        .leftJoin(function() {
          // Subquery: all the privileges this account has been granted
          this.select(
                  'rolePriv.privilege',
                  knex.raw('max(rolePriv.level) as level'))
              .from('account')
              .where('account.id', '=', accountId)
              .join('accountRole', 'accountRole.account', '=', 'account.id')
              .join('rolePriv', 'rolePriv.role', '=', 'accountRole.role')
              .groupBy('rolePriv.privilege')
              .as('grantedPrivs');
        }, 'grantedPrivs.privilege', '=', 'privilege.name');
  },

  getPrivilegesForRoles(roles) {
    // See similar comment in getPrivilegesForAccount
    return this.builder('privilege')
        .select(
            'privilege.name',
            'grantedPrivs.level',
            'privilege.ownerLevel')
        .leftJoin(function() {
          // Subquery: all the privileges these roles have been granted
          this.select(
                  'privilege',
                  knex.raw('max(level) as level'))
              .from('rolePriv')
              .whereIn('role', roles)
              .groupBy('privilege')
              .as('grantedPrivs')
        }, 'grantedPrivs.privilege', '=', 'privilege.name');
  },

  getCharactersOwnedByMembers() {
    // This complex subquery is required because we want to select the
    // characters of all accounts that own 1 or more member character. In
    // particular, in the case where an account's main has left the corp but
    // one of their alts is still a member, we want to include that account
    // (and all of that account's characters).
    return this.builder
        .select(OWNED_CHARACTER_COLUMNS)
        .from(function() {
          this.select()
            .distinct('account.id')
            .from('character')
            .join('ownership', 'ownership.character', '=', 'character.id')
            .join('account', 'account.id', '=', 'ownership.account')
            .whereIn('character.corporationId', allCorpIds)
            .as('memberAccount')
        })
        .join('account', 'account.id', '=', 'memberAccount.id')
        .join('ownership', 'ownership.account', '=', 'memberAccount.id')
        .join('character', 'character.id', '=', 'ownership.character')
        .leftJoin('citadel', 'citadel.id', '=', 'account.homeCitadel');
  },

  getCharactersOwnedByAccount(accountId) {
    return this.builder('account')
        .select(
            'character.id',
            'character.name'
        )
        .join('ownership', 'ownership.account', '=', 'account.id')
        .join('character', 'character.id', '=', 'ownership.character')
        .where('account.id', '=', accountId);
  },

  getUnownedCorpCharacters() {
    return this.builder('character')
        .select(BASIC_CHARACTER_COLUMNS)
        .leftJoin('ownership', 'ownership.character', '=', 'character.id')
        .whereNull('ownership.account');
  },

  getMostRecentCronJob(taskName) {
    return this.builder('cronLog')
        .select('id', 'task', 'start', 'end')
        .where('task', '=', taskName)
        .orderBy('start', 'desc')
        .orderBy('id', 'desc')
        .limit(1)
    .then(([row]) => {
      return row;
    });
  },

  startCronJob(taskName) {
    return this.builder('cronLog')
        .insert({
          task: taskName,
          start: Date.now(),
        })
    .then(([id]) => {
      return id;
    });
  },

  finishCronJob(jobId, result) {
    return this.builder('cronLog')
        .update({
          end: Date.now(),
          result: result
        })
        .where('id', '=', jobId);
  },

  dropOldCronJobs(startCutoff) {
    return this.builder('cronLog')
        .del()
        .where('start', '<', startCutoff);

    /*
    // This is the "more correct" way to to this -- it guarantees that we leave
    // the most recent completed entry in the log even if it's "too old".
    // However, SQLite doesn't support joins on deletes. Womp.
    return this.builder('cronLog as c1')
        .del('c1')
        .leftJoin(function() {
          // The most recent completed entry for each task
          this.select('id', 'max(start) as start')
              .from('cronLog')
              .whereNotNull('end')
              .groupBy('task')
              .as('c2')
        }, 'c1.task', '=', 'c2.task')
        .where('c1.start', '<', 'c2.start')
        .andWhere('c1.start', '<', startCutoff);
    */
  },

  getCronLogsRecent() {
    return this.builder('cronLog')
        .select('id', 'task', 'start', 'end', 'result')
        .orderBy('id', 'desc')
        .limit(400);
  },

  getAccountLogsRecent() {
    return this.builder('accountLog')
        .select(
            'accountLog.id as id',
            'timestamp',
            'account as accountId',
            'mainChar.name as mainCharacter',
            'event',
            'relatedCharacter',
            'relatedChar.name as relatedCharacterName',
            'data')
        .leftJoin('account', 'account.id', '=', 'accountLog.account')
        .leftJoin(
            'character as mainChar', 'mainChar.id', 'account.mainCharacter')
        .leftJoin(
            'character as relatedChar', 'relatedChar.id', 'relatedCharacter')
        .orderBy('timestamp', 'desc')
        .limit(200);
  },

  _upsert(table, row, primaryKey) {
    if (knex.CLIENT == 'sqlite3') {
      // Manually convert booleans to 0/1 for sqlite
      for (let v in row) {
        let val = row[v];
        if (typeof val == 'boolean') {
          row[v] = val ? 1 : 0;
        }
      }

      return this.builder(table)
          .update(row)
          .where(primaryKey, '=', row[primaryKey])
      .then(() => {
        let rawQuery = knex(table)
            .insert(row)
            .toString()
            .replace(/^insert/i, 'insert or ignore');

        return this.builder.raw(rawQuery);
      });
    } else {
      throw new Error('Client not supported: ' + knex.CLIENT);
    }
  },

  logEvent(accountId, event, relatedCharacter, data) {
    if (!LOGGABLE_EVENTS.includes(event)) {
      throw new Error('Not a loggable event: ' + event);
    }
    return this.builder('accountLog')
        .insert({
          timestamp: Date.now(),
          account: accountId,
          event: event,
          relatedCharacter: relatedCharacter,
          data: JSON.stringify(data),
        });
  }

};

module.exports = new Dao(knex);
