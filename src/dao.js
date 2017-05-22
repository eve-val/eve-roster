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
const accountGroups = require('./data-source/accountGroups');
const knex = require('./util/knex-loader');
const specialGroups = require('./route-helper/specialGroups')
const CharacterDao = require('./dao/CharacterDao');
const CitadelDao = require('./dao/CitadelDao');
const ConfigDao = require('./dao/ConfigDao');
const CronDao = require('./dao/CronDao');


const logger = require('./util/logger')(__filename);

const BASIC_CHARACTER_COLUMNS = [
  'character.id',
  'character.name',
  'character.corporationId',
  'character.startDate',
  'character.logonDate',
  'character.logoffDate',
  'character.titles',
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
  'MODIFY_GROUPS',
  'GAIN_MEMBERSHIP',
  'LOSE_MEMBERSHIP',
  'TRANSFER_CHARACTER',
  'MODIFY_SERVER_CONFIG',
];

const MEMBER_GROUP = accountGroups.MEMBER_GROUP;

function Dao(builder) {
  this.builder = builder;

  this.character = new CharacterDao(this, builder);
  this.citadel = new CitadelDao(this, builder);
  this.config = new ConfigDao(this, builder);
  this.cron = new CronDao(this, builder);
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

  getExplicitGroups(accountId) {
    return this.builder('groupExplicit')
        .select('group')
        .where('account', '=', accountId)
    .then(rows => {
      return _.pluck(rows, 'group');
    });
  },

  getTitleDerivedGroups(corporationId, titles) {
    return this.builder('groupTitle')
        .select('group')
        .whereIn('title', titles)
        .andWhere('corporation', '=', corporationId)
    .then(rows => {
      return _.pluck(rows, 'group');
    });
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

  createAccount(charId) {
    let id;
    return this.transaction(trx => {
      return trx.builder('account')
          .insert({ created: Date.now(), mainCharacter: charId })
      .then(([_id]) => {
        id = _id;
        return trx.logEvent(id, 'CREATE_ACCOUNT');
      })
      .then(() => {
        if (id == 1) {
          logger.info('First account login! Setting as admin...');
          return trx.builder('groupExplicit')
              .insert({
                account: id,
                group: specialGroups.ADMIN_GROUP,
              });
        }
      })
      .then(() => {
        return id;
      });
    });
  },

  deleteAccountIfEmpty(accountId, newAccountId) {
    return this.transaction(trx => {
      return trx.builder('ownership').select().where('account', accountId)
      .then(rows => {
        if (rows.length > 0) { return; }  // Not empty, don't delete

        return trx.builder('accountLog').where('account', accountId).update({
          account: newAccountId,
          originalAccount: accountId
        })
        .then(() => trx.builder('accountGroup').del().where('account', accountId))
        .then(() => trx.builder('groupExplicit').del().where('account', accountId))
        .then(() => trx.builder('pendingOwnership').del().where('account', accountId))
        .then(() => trx.builder('account').del().where('id', accountId));
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
          return accountGroups.updateAccount(trx, accountId);
        }
      });
    });
  },

  deleteOwnership(characterId, accountId, newAccountId) {
    return this.transaction(trx => {
      return trx.builder('ownership')
        .select('account.mainCharacter', 'ownership.character')
        .leftJoin('account', 'ownership.account', 'account.id')
        .where('ownership.account', accountId)
      .then(rows => {
        // Designate a new main if necessary
        if (rows.length > 1 && characterId == rows[0].mainCharacter) {
          for (const row of rows) {
            if (row.character != row.mainCharacter) {
              return trx.setAccountMain(accountId, row.character);
            }
          }
        }
      })
      .then(() => {
        return trx.builder('ownership').del().where('character', characterId)
        .then(() => trx.deleteAccountIfEmpty(accountId, newAccountId));
      });
    });
  },

  createPendingOwnership(characterId, accountId) {
    return this.transaction(trx => {
      return trx.builder('pendingOwnership').del().where('character', characterId)
      .then(() => {
        return trx.builder('pendingOwnership').insert({
          character: characterId,
          account: accountId,
        });
      });
    })
  },

  getPendingOwnership(accountId) {
    return this.builder('pendingOwnership')
        .select('pendingOwnership.character', 'character.name')
        .leftJoin('character', 'character.id', 'pendingOwnership.character')
        .where('account', accountId);
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
        return accountGroups.updateAccount(trx, accountId);
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

  getAccountGroups(accountId) {
    return this.builder('accountGroup')
        .select('group')
        .where('account', '=', accountId)
    .then(rows => _.pluck(rows, 'group'));
  },

  setAccountGroups(accountId, groups) {
    return this.transaction(trx => {
      let oldGroups;
      groups.sort((a, b) => a.localeCompare(b));

      return trx.getAccountGroups(accountId)
      .then(_oldGroups => {
        oldGroups = _oldGroups;
        return trx.builder('accountGroup')
            .del()
            .where('account', '=', accountId)
      })
      .then(() => {
        if (groups.length > 0) {
          return trx.builder('accountGroup')
              .insert(
                  groups.map(group => ({ account: accountId, group: group }) ));
        }
      })
      .then(() => {
        if (!_.isEqual(oldGroups, groups)) {
          return trx.logEvent(accountId, 'MODIFY_GROUPS', null, {
            old: oldGroups,
            new: groups,
          });
        }
      })
      .then(() => {
        if (!oldGroups.includes(MEMBER_GROUP) &&
            groups.includes(MEMBER_GROUP)) {
          return trx.logEvent(accountId, 'GAIN_MEMBERSHIP');
        } else if (oldGroups.includes(MEMBER_GROUP) &&
            !groups.includes(MEMBER_GROUP)) {
          return trx.logEvent(accountId, 'LOSE_MEMBERSHIP');
        }
      });
    });
  },

  getPrivilegesForGroups(groups) {
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
          // Subquery: all the privileges these groups have been granted
          this.select(
                  'privilege',
                  knex.raw('max(level) as level'))
              .from('groupPriv')
              .whereIn('group', groups)
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
    return this.builder('memberCorporation')
        .select(BASIC_CHARACTER_COLUMNS)
        .join('character',
            'character.corporationId', '=', 'memberCorporation.corporationId')
        .leftJoin('ownership', 'ownership.character', '=', 'character.id')
        .leftJoin('killboard', 'killboard.character', '=', 'character.id')
        .whereNull('ownership.account');
  },

  getAccountLogsRecent() {
    return this.builder('accountLog')
        .select(
            'accountLog.id as id',
            'timestamp',
            'account as accountId',
            'originalAccount',
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

  // Get all unique corporation IDs in the roster, which can include
  // non-member corporations if someone leaves but their character is still
  // in the roster. Or for opsec alts, etc.
  getRosterCharacterCorps() {
    return this.builder('character')
        .distinct('corporationId')
        .select()
    .then(corpIds => {
      // Map from [{corporationId: num}] to [num]
      return corpIds.map(e => e.corporationId);
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
