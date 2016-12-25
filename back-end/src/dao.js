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

const configLoader = require('../src/config-loader');
const CONFIG = configLoader.load();

const knex = require('knex')({
  client: 'sqlite3',
  debug: false,
  useNullAsDefault: true,
  connection: {
    filename: CONFIG.dbFileName
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

  setCharacterCitadel: function(id, citadel) {
    return this.builder('character')
        .where({id: id})
        .update({homeCitadel: citadel});
  },

  setAccountMain: function(accountId, mainCharacterId) {
    return this.builder('account')
        .where({id: accountId})
        .update({mainCharacter: mainCharacterId});
  },

  createCharacter: function(id, name, corporationId) {
    return this.builder('character').insert({
      id: id,
      name: name,
      corporationId: corporationId,
    });
  },

  createAccessTokens: function(
      characterId, refreshToken, accessToken, expiresIn) {
    return this.builder('accessToken').insert({
      character: characterId,
      refreshToken: refreshToken,
      accessToken: accessToken,
      accessTokenExpires: Date.now() + expiresIn * 1000,
      needsUpdate: false,
    });
  },

  updateAccessTokens: function(
      characterId, refreshToken, accessToken, expiresIn) {
    return this.builder('accessToken')
        .where({character: characterId})
        .update({
          refreshToken: refreshToken,
          accessToken: accessToken,
          accessTokenExpires: Date.now() + expiresIn * 1000,
          needsUpdate: false
        });
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
};

module.exports = new Dao(knex);
