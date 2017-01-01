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

const CONFIG = require('../src/config-loader').load();
const CLIENT = 'sqlite3';
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
  'account.homeCitadel',

  'account.id as accountId',
  'account.mainCharacter',
]);

const knex = require('knex')({
  client: CLIENT,
  debug: false,
  useNullAsDefault: true,
  connection: {
    filename: path.join(__dirname, '../', CONFIG.dbFileName),
  }
});

function Dao(builder) {
  this.builder = builder;
}
Dao.prototype = {
  transaction: function(callback) {
    return this.builder.transaction((trx) => {
      return callback(new Dao(trx));
    });
  },

  commit: function() {
    return this.builder.commit();
  },

  rollback: function() {
    return this.builder.rollback();
  },

  batchInsert: function(table, rows, chunkSize) {
    let work = knex.batchInsert(table, rows, chunkSize);
    if (this.builder != knex) {
      work = work.transacting(this.builder);
    }
    return work;
  },

  getCitadels: function() {
    return this.builder('citadel').select();
  },

  getCitadelByName: function(name) {
    return this.builder('citadel').select().where({name: name});
  },

  getCharacters: function() {
    return this.builder('character').select();
  },

  getCharacterByName: function(name) {
    return this.builder('character').select().where({name: name});
  },

  getCharacterById: function(id) {
    return this.builder('character').select().where({id: id});
  },

  upsertCharacter: function(id, name, corporationId, extraColumns) {
    let fullVals = Object.assign(extraColumns || {}, {
      id: id,
      name: name,
      corporationId: corporationId,
    });

    return this._upsert('character', fullVals, 'id');
  },

  updateCharacter: function(id, vals) {
    return this.builder('character').update(vals).where('id', '=', id);
  },

  upsertAccessTokens: function(
      characterId, refreshToken, accessToken, expiresIn) {
    return this._upsert('accessToken', {
      character: characterId,
      refreshToken: refreshToken,
      accessToken: accessToken,
      accessTokenExpires: Date.now() + expiresIn * 1000,
      needsUpdate: false,
    }, 'character');
  },

  createAccount: function() {
    return this.builder('account')
        .insert({ created: Math.floor(Date.now() / 1000), })
    .then(function(ids) {
      return ids[0];
    });
  },

  ownCharacter: function(characterId, accountId, isMain) {
    return this.builder('ownership').insert({
      account: accountId,
      character: characterId,
    })
    .then(() => {
      // TODO: Change this to automatically apply if there are no other
      // chars owned by the account
      if (isMain) {
        return this.setAccountMain(accountId, characterId);
      }
    });
  },

  setAccountMain: function(accountId, mainCharacterId) {
    return this.builder('account')
        .where({id: accountId})
        .update({mainCharacter: mainCharacterId});
  },

  setAccountCitadel: function(accountId, citadel) {
    return this.builder('account')
        .where({id: accountId})
        .update({homeCitadel: citadel});
  },

  setAccountRoles: function(accountId, roles) {
    // TODO: start transaction if not already in a transaction?
    return this.builder('accountRole')
        .del()
        .where('account', '=', accountId)
    .then(() => {
      if (roles.length > 0) {
        return this.builder('accountRole')
            .insert(roles.map(role => ({ account: accountId, role: role }) ));
      }
    })
  },

  getPrivilegesForAccount: function(accountId) {
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

  getPrivilegesForRoles: function(roles) {
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

  getCharactersOwnedByMembers: function() {
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
        .join('character', 'character.id', '=', 'ownership.character');
  },

  getUnownedCorpCharacters: function() {
    return this.builder('character')
        .select(BASIC_CHARACTER_COLUMNS)
        .leftJoin('ownership', 'ownership.character', '=', 'character.id')
        .whereNull('ownership.account');
  },

  _upsert: function(table, row, primaryKey) {
    if (CLIENT == 'sqlite3') {
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
      throw new Error('Client not supported: ' + CLIENT);
    }
  },

};

module.exports = new Dao(knex);
