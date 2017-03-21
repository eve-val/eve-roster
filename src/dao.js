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

const asyncUtil = require('./util/asyncUtil');
const accountRoles = require('./data-source/accountRoles');
const knex = require('./util/knex-loader');

const BASIC_CHARACTER_COLUMNS = [
  'character.id',
  'character.name',
  'character.corporationId',
  'character.startDate',
  'character.logonDate',
  'character.logoffDate',
  'killboard.killsInLastMonth',
  'killboard.killValueInLastMonth',
  'killboard.lossesInLastMonth',
  'killboard.lossValueInLastMonth',
  'character.siggyScore',
];
const OWNED_CHARACTER_COLUMNS = BASIC_CHARACTER_COLUMNS.concat([
  'account.activeTimezone',
  'citadel.name as homeCitadel',

  'account.id as accountId',
  'account.mainCharacter',
  'ownership.opsec',
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

const MEMBER_ROLE = accountRoles.MEMBER_ROLE;

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

  getMemberCorporations() {
    return this.builder('memberCorporation')
        .select('corporationId', 'membership', 'apiKeyId', 'apiVerificationCode');
  },

  getExplicitRoles(accountId) {
    return this.builder('roleExplicit')
        .select('role')
        .where('account', '=', accountId)
    .then(rows => {
      return _.pluck(rows, 'role');
    });
  },

  getTitleRoles(corporationId, titles) {
    return this.builder('roleTitle')
        .select('role')
        .whereIn('title', titles)
        .andWhere('corporation', '=', corporationId)
    .then(rows => {
      return _.pluck(rows, 'role');
    });
  },

  getCitadels() {
    return this.builder('citadel').select();
  },

  getCitadel(id) {
    return this.builder('citadel').select().where('id', '=', id);
  },

  getCitadelByName(name) {
    return this.builder('citadel').select().where({name: name});
  },

  setCitadelName(id, name) {
    return this.builder('citadel').update({ name: name }).where('id', '=', id);
  },

  addCitadel(name, type, allianceAccess, allianceOwned) {
    return this.builder('citadel').insert({
        name: name,
        type: type,
        allianceAccess: allianceAccess,
        allianceOwned: allianceOwned,
      })
      .then(([id]) => {
        return id;
      });
  },

  dropCitadel(id) {
    return this.builder('citadel').del().where('id', '=', id);
  },

  getCharacters() {
    return this.builder('character').select();
  },

  getCharacterByName(name) {
    return this.builder('character').select().where({name: name});
  },

  getCharacterById(id, columns=['character.name']) {
    return this.builder('character').select(...columns).where({id: id});
  },

  getCharacterAndOwner(characterId, columns=['character.name']) {
    return this.builder('character')
        .select(columns)
        .leftJoin('ownership', 'ownership.character', '=', 'character.id')
        .leftJoin('account', 'account.id', '=', 'ownership.account')
        .leftJoin('memberCorporation as memberCorp',
            'memberCorp.corporationId', '=', 'character.corporationId')
        .where('character.id', '=', characterId);
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

  setCharacterIsOpsec(characterId, isOpsec) {
    return this.builder('ownership')
        .update({ opsec: isOpsec })
        .where('character', '=', characterId);
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
        opsec: false,
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

  getAccountRoles(accountId) {
    return this.builder('accountRole')
        .select('role')
        .where('account', '=', accountId)
    .then(rows => _.pluck(rows, 'role'));
  },

  setAccountRoles(accountId, roles) {
    return this.transaction(trx => {
      let oldRoles;
      roles.sort((a, b) => a.localeCompare(b));

      return trx.getAccountRoles(accountId)
      .then(_oldRoles => {
        oldRoles = _oldRoles;
        return trx.builder('accountRole')
            .del()
            .where('account', '=', accountId)
      })
      .then(() => {
        if (roles.length > 0) {
          return trx.builder('accountRole')
              .insert(roles.map(role => ({ account: accountId, role: role }) ));
        }
      })
      .then(() => {
        if (!_.isEqual(oldRoles, roles)) {
          return trx.logEvent(accountId, 'MODIFY_ROLES', null, {
            old: oldRoles,
            new: roles,
          });
        }
      })
      .then(() => {
        if (!oldRoles.includes(MEMBER_ROLE) && roles.includes(MEMBER_ROLE)) {
          return trx.logEvent(accountId, 'GAIN_MEMBERSHIP');
        } else if (oldRoles.includes(MEMBER_ROLE) &&
            !roles.includes(MEMBER_ROLE)) {
          return trx.logEvent(accountId, 'LOSE_MEMBERSHIP');
        }
      });
    });
  },

  getPrivilegesForRoles(roles) {
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
            'privilege.ownerLevel',
            'privilege.requiresMembership')
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
          this.select('account.id')
            .distinct('account.id')
            .from('memberCorporation as memberCorp')
            .join('character',
                'character.corporationId', '=', 'memberCorp.corporationId')
            .join('ownership', 'ownership.character', '=', 'character.id')
            .join('account', 'account.id', '=', 'ownership.account')
            .as('memberAccount')
        })
        .join('account', 'account.id', '=', 'memberAccount.id')
        .join('ownership', 'ownership.account', '=', 'memberAccount.id')
        .join('character', 'character.id', '=', 'ownership.character')
        .leftJoin('citadel', 'citadel.id', '=', 'account.homeCitadel')
        .leftJoin('killboard', 'killboard.character', '=', 'character.id');
  },

  getCharactersOwnedByAccount(
      accountId,
      columns=['character.id', 'character.name']) {
    return this.builder('account')
        .select(...columns)
        .join('ownership', 'ownership.account', '=', 'account.id')
        .join('character', 'character.id', '=', 'ownership.character')
        .leftJoin('accessToken', 'accessToken.character', '=', 'character.id')
        .leftJoin('memberCorporation',
            'memberCorporation.corporationId', '=', 'character.corporationId')
        .where('account.id', '=', accountId);
  },

  getUnownedCorpCharacters() {
    return this.builder('character')
        .select(BASIC_CHARACTER_COLUMNS)
        .leftJoin('ownership', 'ownership.character', '=', 'character.id')
        .leftJoin('killboard', 'killboard.character', '=', 'character.id')
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

  getCharacterKillboardTimestamps() {
    return this.builder('character')
        .select('character.id', 'character.name', 'killboard.updated')
        .leftJoin('killboard', 'killboard.character', '=', 'character.id');
  },

  updateCharacterKillboard(characterId, kills, losses, killValue, lossValue) {
    return this._upsert('killboard', {
      character: characterId,
      killsInLastMonth: kills,
      killValueInLastMonth: killValue,
      lossesInLastMonth: losses,
      lossValueInLastMonth: lossValue,
      updated: Date.now(),
    }, 'character');
  },

  getConfig(...names) {
    return this.builder('config')
        .select('key', 'value')
        .whereIn('key', names)
    .then(rows => {
      let config = {};
      for (let row of rows) {
        config[row.key] = JSON.parse(row.value);
      }
      return config;
    })
  },

  setConfig(values) {
    return asyncUtil.serialize(Object.keys(values), key => {
      return this.builder('config')
          .update({ value: JSON.stringify(values[key]) })
          .where('key', '=', key)
      .then(updated => {
        if (updated != 1) {
          throw new Error(`Cannot write to nonexistent config value "${key}"`);
        }
      });
    });
  },

  _upsert(table, row, primaryKey) {
    if (row[primaryKey] == undefined) {
      throw new Error(`Primary key "${primaryKey}" not defined on input row.`);
    }

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
          originalAccount: accountId,
          event: event,
          relatedCharacter: relatedCharacter,
          data: JSON.stringify(data),
        });
  }

};

module.exports = new Dao(knex);
