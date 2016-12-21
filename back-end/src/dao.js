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
    return new Promise((resolve, reject) => {
      knex.transaction(function(trx) {
        resolve(new Dao(trx));
      });
    });
  },

  commit: function() {
    return this.builder.commit();
  },

  rollback: function() {
    return this.builder.rollback();
  },

  getCitadels: function() {
    return this.builder.select().from('citadel');
  },

  getCitadelByName: function(name) {
    return this.builder.select().from('citadel').where('name', name);
  },

  getMembers: function() {
    return this.builder.select().from('member');
  },

  getMemberByName: function(name) {
    return this.builder.select().from('member').where('name', name);
  },

  getMemberByID: function(id) {
    return this.builder.select().from('member').where('characterID', id);
  },

  setMemberCitadel: function(id, citadel) {
    return this.builder.insert([{homeCitadel: citadel}])
        .into('member').where('characterID', id);
  },

  setMemberMain: function(id, mainCharacterID) {
    return this.builder.insert([{mainID: mainCharacterID}])
        .into('member').where('characterID', id);
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
        .where('character', '=', characterId)
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
        return this.builder('account').update('mainCharacter', characterId);
      }
    });
  },
}

module.exports = new Dao(knex);
