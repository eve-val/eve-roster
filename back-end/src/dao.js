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

const configLoader = require('../src/config-loader');
const CONFIG = configLoader.load();

const CLIENT = 'sqlite3';

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
    return this.builder('account').insert({
      roles: 'Junior Sound FC',
    })
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
